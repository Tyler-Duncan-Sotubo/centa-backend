// src/modules/performance/activity/objective-activity.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';

import { S3StorageService } from 'src/common/aws/s3-storage.service';
import {
  companyFileFolders,
  objectiveAttachments,
  objectiveComments,
  performanceGoalUpdates,
} from 'src/drizzle/schema';
import { keyResults } from './schema/performance-key-results.schema';
import { objectives } from './schema/performance-objectives.schema';
import { AddGoalCommentDto } from './dto/add-goal-comment.dto';
import { UploadGoalAttachmentDto } from './dto/upload-goal-attachment.dto';
import { UpdateGoalAttachmentDto } from './dto/update-goal-attachment.dto';
import { AddKrCheckinDto } from './dto/add-kr-checkin.dto';
import { AddObjectiveCheckinDto } from './dto/add-objective-checkin.dto';

@Injectable()
export class GoalActivityService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly s3: S3StorageService,
  ) {}

  // --------------------------------------------------------------------------
  // CHECK-INS
  // --------------------------------------------------------------------------

  /** Preferred: record a check-in on a Key Result */
  async addKrCheckin(krId: string, dto: AddKrCheckinDto, user: User) {
    const { id: userId } = user;

    // Load KR with objective for recompute
    const [kr] = await this.db
      .select({
        id: keyResults.id,
        objectiveId: keyResults.objectiveId,
        type: keyResults.type, // "metric" | "milestone" | "binary"
        direction: keyResults.direction, // "increase_to" | "decrease_to" | "at_least" | "at_most" | "range"
        baseline: keyResults.baseline,
        target: keyResults.target,
        minRange: keyResults.minRange,
        maxRange: keyResults.maxRange,
        current: keyResults.current,
        progressPct: keyResults.progressPct,
        isArchived: keyResults.isArchived,
      })
      .from(keyResults)
      .where(eq(keyResults.id, krId))
      .limit(1);

    if (!kr || kr.isArchived)
      throw new BadRequestException('Key Result not found or archived');

    // Compute progressPct based on KR type/config
    const { computedCurrent, computedPct } = this.computeKrProgress(kr, dto);

    // Enforce non-decreasing progress unless allowed
    const lastPct = kr.progressPct ?? 0;
    if (!dto.allowRegression && computedPct < lastPct) {
      throw new BadRequestException(
        `Cannot decrease progress (${computedPct.toFixed(2)} < ${lastPct.toFixed(2)})`,
      );
    }

    // Create update row
    const [update] = await this.db
      .insert(performanceGoalUpdates)
      .values({
        keyResultId: krId,
        objectiveId: null,
        value: computedCurrent !== null ? String(computedCurrent) : null,
        progressPct: Math.round(computedPct),
        note: dto.note ?? null,
        createdBy: userId,
        createdAt: new Date(),
      })
      .returning();

    // Update KR cache
    await this.db
      .update(keyResults)
      .set({
        current:
          computedCurrent !== null ? String(computedCurrent) : kr.current,
        progressPct: Math.round(computedPct),
        updatedAt: new Date(),
      })
      .where(eq(keyResults.id, krId));

    // Recompute objective score (weighted avg of non-archived KRs)
    await this.recomputeObjectiveScore(kr.objectiveId);

    await this.audit.logAction({
      action: 'create',
      entity: 'performance_progress_update',
      entityId: update.id,
      userId,
      details: `KR check-in recorded for KR ${krId}`,
      changes: { progressPct: update.progressPct, value: update.value },
    });

    return update;
  }

  /** Optional: record a manual check-in at the Objective level (no KR) */
  async addObjectiveCheckin(
    objectiveId: string,
    dto: AddObjectiveCheckinDto,
    user: User,
  ) {
    const { id: userId } = user;

    const [obj] = await this.db
      .select({
        id: objectives.id,
        isArchived: objectives.isArchived,
        score: objectives.score,
      })
      .from(objectives)
      .where(eq(objectives.id, objectiveId))
      .limit(1);

    if (!obj || obj.isArchived)
      throw new BadRequestException('Objective not found or archived');

    const pct = dto.progressPct;
    if (pct < 0 || pct > 100)
      throw new BadRequestException('progressPct must be 0..100');
    if (!dto.allowRegression && obj.score != null && pct < obj.score) {
      throw new BadRequestException(
        `Cannot decrease progress (${pct} < ${obj.score})`,
      );
    }

    const [update] = await this.db
      .insert(performanceGoalUpdates)
      .values({
        objectiveId,
        keyResultId: null,
        value: null,
        progressPct: Math.round(pct),
        note: dto.note ?? null,
        createdBy: userId,
        createdAt: new Date(),
      })
      .returning();

    await this.db
      .update(objectives)
      .set({ score: Math.round(pct), updatedAt: new Date() })
      .where(eq(objectives.id, objectiveId));

    await this.audit.logAction({
      action: 'create',
      entity: 'performance_progress_update',
      entityId: update.id,
      userId,
      details: `Objective check-in recorded for Objective ${objectiveId}`,
      changes: { progressPct: update.progressPct },
    });

    return update;
  }

  /** Edit the NOTE of a check-in (by its update id) */
  async updateCheckinNote(updateId: string, note: string, user: User) {
    const { id: userId } = user;

    const [upd] = await this.db
      .select({
        id: performanceGoalUpdates.id,
        createdBy: performanceGoalUpdates.createdBy,
      })
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.id, updateId))
      .limit(1);

    if (!upd) throw new BadRequestException('Check-in not found');
    if (upd.createdBy !== userId)
      throw new BadRequestException(
        'You do not have permission to update this check-in',
      );

    const [updated] = await this.db
      .update(performanceGoalUpdates)
      .set({ note, createdAt: new Date() }) // keep a simple updatedAt; if you have it, set updatedAt instead
      .where(eq(performanceGoalUpdates.id, updateId))
      .returning();

    await this.audit.logAction({
      action: 'update',
      entity: 'performance_progress_update',
      entityId: updateId,
      userId,
      details: `Updated check-in note ${updateId}`,
      changes: { note },
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // COMMENTS
  // --------------------------------------------------------------------------

  /** Add a comment at either Objective or KR */
  async addComment(
    user: User,
    dto: AddGoalCommentDto & {
      objectiveId?: string | null;
      keyResultId?: string | null;
    },
  ) {
    const { id: userId } = user;
    const { objectiveId, keyResultId, comment, isPrivate } = dto;

    this.assertXorTarget(objectiveId, keyResultId);

    // target existence
    if (objectiveId) await this.ensureObjectiveExists(objectiveId);
    if (keyResultId) await this.ensureKrExists(keyResultId);

    const [row] = await this.db
      .insert(objectiveComments)
      .values({
        objectiveId: objectiveId ?? null,
        keyResultId: keyResultId ?? null,
        authorId: userId,
        comment,
        isPrivate: !!isPrivate,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await this.audit.logAction({
      action: 'create',
      entity: 'objective_comment',
      entityId: row.id,
      userId,
      details: `Added ${isPrivate ? 'private ' : ''}comment`,
    });

    return row;
  }

  async updateComment(commentId: string, user: User, content: string) {
    const { id: userId } = user;

    const [row] = await this.db
      .select({
        id: objectiveComments.id,
        authorId: objectiveComments.authorId,
      })
      .from(objectiveComments)
      .where(eq(objectiveComments.id, commentId))
      .limit(1);

    if (!row) throw new BadRequestException('Comment not found');
    if (row.authorId !== userId)
      throw new BadRequestException(
        'You do not have permission to edit this comment',
      );

    const [updated] = await this.db
      .update(objectiveComments)
      .set({ comment: content, updatedAt: new Date() })
      .where(eq(objectiveComments.id, commentId))
      .returning();

    await this.audit.logAction({
      action: 'update',
      entity: 'objective_comment',
      entityId: commentId,
      userId,
      details: `Updated comment ${commentId}`,
      changes: { content },
    });

    return updated;
  }

  async deleteComment(commentId: string, user: User) {
    const { id: userId } = user;

    const [row] = await this.db
      .select({
        id: objectiveComments.id,
        authorId: objectiveComments.authorId,
        objectiveId: objectiveComments.objectiveId,
        keyResultId: objectiveComments.keyResultId,
      })
      .from(objectiveComments)
      .where(eq(objectiveComments.id, commentId))
      .limit(1);

    if (!row) throw new BadRequestException('Comment not found');
    if (row.authorId !== userId)
      throw new BadRequestException(
        'You do not have permission to delete this comment',
      );

    await this.db
      .delete(objectiveComments)
      .where(eq(objectiveComments.id, commentId));

    await this.audit.logAction({
      action: 'delete',
      entity: 'objective_comment',
      entityId: commentId,
      userId,
      details: `Deleted comment ${commentId}`,
    });

    return { message: 'Comment deleted successfully' };
  }

  // --------------------------------------------------------------------------
  // ATTACHMENTS
  // --------------------------------------------------------------------------

  /** Upload an attachment for an Objective or KR */
  async uploadAttachment(dto: UploadGoalAttachmentDto, user: User) {
    const { id: userId, companyId } = user;
    const { objectiveId, keyResultId } = dto;

    this.assertXorTarget(objectiveId, keyResultId);
    if (objectiveId) await this.ensureObjectiveExists(objectiveId);
    if (keyResultId) await this.ensureKrExists(keyResultId);

    // Folder
    const folder = await this.getOrCreateFolder(companyId, 'OKR Attachments');

    // Parse file
    const [meta, base64Data] = dto.file.base64.split(',');
    const mimeMatch = meta.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];
    if (!mimeType || !base64Data)
      throw new BadRequestException('Invalid file format');

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `company-files/${companyId}/${folder.id}/${Date.now()}-${dto.file.name}`;

    const { url } = await this.s3.uploadBuffer(
      buffer,
      key,
      companyId,
      'okr_attachment',
      'attachment',
      mimeType,
    );

    const [row] = await this.db
      .insert(objectiveAttachments)
      .values({
        objectiveId: objectiveId ?? null,
        keyResultId: keyResultId ?? null,
        uploadedById: userId,
        fileUrl: url,
        fileName: dto.file.name,
        comment: dto.comment ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await this.audit.logAction({
      action: 'upload',
      entity: 'objective_attachment',
      entityId: row.id,
      userId,
      details: `Uploaded attachment (${dto.file.name})`,
    });

    return row;
  }

  async updateAttachment(
    attachmentId: string,
    user: User,
    dto: UpdateGoalAttachmentDto,
  ) {
    const { id: userId, companyId } = user;

    const [att] = await this.db
      .select({
        id: objectiveAttachments.id,
        uploadedById: objectiveAttachments.uploadedById,
        fileUrl: objectiveAttachments.fileUrl,
        fileName: objectiveAttachments.fileName,
      })
      .from(objectiveAttachments)
      .where(eq(objectiveAttachments.id, attachmentId))
      .limit(1);

    if (!att) throw new BadRequestException('Attachment not found');
    if (att.uploadedById !== userId)
      throw new BadRequestException(
        'You do not have permission to update this attachment',
      );

    let fileName = att.fileName;
    let fileUrl = att.fileUrl;

    if (dto.file) {
      const [meta, base64Data] = dto.file.base64.split(',');
      const mimeMatch = meta.match(/data:(.*);base64/);
      const mimeType = mimeMatch?.[1];
      if (!mimeType || !base64Data)
        throw new BadRequestException('Invalid file format');

      const buffer = Buffer.from(base64Data, 'base64');
      const key = `company-files/${companyId}/OKR Attachments/${Date.now()}-${dto.file.name}`;
      const uploaded = await this.s3.uploadBuffer(
        buffer,
        key,
        companyId,
        'okr_attachment',
        'attachment',
        mimeType,
      );

      fileName = dto.file.name;
      fileUrl = uploaded.url;
    }

    const [updated] = await this.db
      .update(objectiveAttachments)
      .set({
        fileUrl,
        fileName,
        comment: dto.comment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(objectiveAttachments.id, attachmentId))
      .returning();

    await this.audit.logAction({
      action: 'update',
      entity: 'objective_attachment',
      entityId: attachmentId,
      userId,
      details: `Updated attachment ${attachmentId}`,
    });

    return updated;
  }

  async deleteAttachment(attachmentId: string, user: User) {
    const { id: userId } = user;

    const [att] = await this.db
      .select({
        id: objectiveAttachments.id,
        uploadedById: objectiveAttachments.uploadedById,
        fileUrl: objectiveAttachments.fileUrl,
      })
      .from(objectiveAttachments)
      .where(eq(objectiveAttachments.id, attachmentId))
      .limit(1);

    if (!att) throw new BadRequestException('Attachment not found');
    if (att.uploadedById !== userId)
      throw new BadRequestException(
        'You do not have permission to delete this attachment',
      );

    await this.s3.deleteFileFromS3(att.fileUrl);
    await this.db
      .delete(objectiveAttachments)
      .where(eq(objectiveAttachments.id, attachmentId));

    await this.audit.logAction({
      action: 'delete',
      entity: 'objective_attachment',
      entityId: attachmentId,
      userId,
      details: `Deleted attachment ${attachmentId}`,
    });

    return { message: 'Attachment deleted successfully' };
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /** Compute KR progress% and current value depending on KR type/config */
  private computeKrProgress(
    kr: {
      type: 'metric' | 'milestone' | 'binary';
      direction:
        | 'increase_to'
        | 'decrease_to'
        | 'at_least'
        | 'at_most'
        | 'range'
        | null;
      baseline: string | number | null;
      target: string | number | null;
      minRange: string | number | null;
      maxRange: string | number | null;
      current: string | number | null;
    },
    dto: AddKrCheckinDto,
  ): { computedCurrent: number | null; computedPct: number } {
    const num = (v: any) => (v === null || v === undefined ? null : Number(v));

    // Metric KR
    if (kr.type === 'metric' && kr.direction) {
      const baseline = num(kr.baseline);
      const target = num(kr.target);
      const minR = num(kr.minRange);
      const maxR = num(kr.maxRange);
      const current =
        dto.value !== undefined && dto.value !== null
          ? Number(dto.value)
          : num(kr.current);

      if (current === null)
        throw new BadRequestException(
          'value is required for metric KR check-ins',
        );

      let pct = 0;

      switch (kr.direction) {
        case 'increase_to':
        case 'at_least': {
          if (baseline === null || target === null)
            throw new BadRequestException('baseline/target required');
          pct = (current - baseline) / (target - baseline);
          break;
        }
        case 'decrease_to':
        case 'at_most': {
          if (baseline === null || target === null)
            throw new BadRequestException('baseline/target required');
          pct = (baseline - current) / (baseline - target);
          break;
        }
        case 'range': {
          if (minR === null || maxR === null)
            throw new BadRequestException('min/max range required');
          if (current >= minR && current <= maxR) pct = 1;
          else {
            // outside range -> 0 (or you can grade distance; keeping simple)
            pct = 0;
          }
          break;
        }
        default:
          pct = 0;
      }

      pct = Math.max(0, Math.min(1, pct));
      return { computedCurrent: current, computedPct: pct * 100 };
    }

    // Milestone/binary or manual: use provided progressPct
    const pct = dto.progressPct;
    if (pct === undefined || pct === null) {
      throw new BadRequestException(
        'progressPct is required for non-metric KR check-ins',
      );
    }
    if (pct < 0 || pct > 100)
      throw new BadRequestException('progressPct must be 0..100');

    return { computedCurrent: null, computedPct: pct };
  }

  /** Weighted average of active KRs progressPct; stores as 0..100 in objectives.score */
  private async recomputeObjectiveScore(objectiveId: string) {
    // pull KRs (non-archived) with weights
    const rows = await this.db
      .select({
        weight: keyResults.weight,
        progressPct: keyResults.progressPct,
        isArchived: keyResults.isArchived,
      })
      .from(keyResults)
      .where(
        and(
          eq(keyResults.objectiveId, objectiveId),
          eq(keyResults.isArchived, false),
        ),
      );

    if (rows.length === 0) {
      await this.db
        .update(objectives)
        .set({ score: null, updatedAt: new Date() })
        .where(eq(objectives.id, objectiveId));
      return;
    }

    let sumW = 0;
    let acc = 0;
    for (const r of rows) {
      const w = r.weight ?? 0;
      const pct = r.progressPct ?? 0;
      sumW += w || 0;
      acc += (w || 0) * pct;
    }

    const score =
      sumW > 0
        ? Math.round(acc / sumW)
        : Math.round(
            rows.reduce((a, r) => a + (r.progressPct ?? 0), 0) / rows.length,
          );

    await this.db
      .update(objectives)
      .set({ score, updatedAt: new Date() })
      .where(eq(objectives.id, objectiveId));
  }

  private async ensureObjectiveExists(objectiveId: string) {
    const [obj] = await this.db
      .select({ id: objectives.id, isArchived: objectives.isArchived })
      .from(objectives)
      .where(eq(objectives.id, objectiveId))
      .limit(1);
    if (!obj || obj.isArchived)
      throw new BadRequestException('Objective not found or archived');
  }

  private async ensureKrExists(krId: string) {
    const [kr] = await this.db
      .select({ id: keyResults.id, isArchived: keyResults.isArchived })
      .from(keyResults)
      .where(eq(keyResults.id, krId))
      .limit(1);
    if (!kr || kr.isArchived)
      throw new BadRequestException('Key Result not found or archived');
  }

  private assertXorTarget(
    objectiveId?: string | null,
    keyResultId?: string | null,
  ) {
    const a = !!objectiveId;
    const b = !!keyResultId;
    if (a === b)
      throw new BadRequestException(
        'Provide exactly one of objectiveId or keyResultId',
      );
  }

  private async getOrCreateFolder(companyId: string, name: string) {
    let [folder] = await this.db
      .select()
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, name),
        ),
      );

    if (!folder) {
      [folder] = await this.db
        .insert(companyFileFolders)
        .values({ companyId, name, createdAt: new Date() })
        .returning();
    }
    return folder;
  }
}
