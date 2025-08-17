"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalActivityService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
const schema_1 = require("../../../drizzle/schema");
const performance_key_results_schema_1 = require("./schema/performance-key-results.schema");
const performance_objectives_schema_1 = require("./schema/performance-objectives.schema");
let GoalActivityService = class GoalActivityService {
    constructor(db, audit, s3) {
        this.db = db;
        this.audit = audit;
        this.s3 = s3;
    }
    async addKrCheckin(krId, dto, user) {
        const { id: userId } = user;
        const [kr] = await this.db
            .select({
            id: performance_key_results_schema_1.keyResults.id,
            objectiveId: performance_key_results_schema_1.keyResults.objectiveId,
            type: performance_key_results_schema_1.keyResults.type,
            direction: performance_key_results_schema_1.keyResults.direction,
            baseline: performance_key_results_schema_1.keyResults.baseline,
            target: performance_key_results_schema_1.keyResults.target,
            minRange: performance_key_results_schema_1.keyResults.minRange,
            maxRange: performance_key_results_schema_1.keyResults.maxRange,
            current: performance_key_results_schema_1.keyResults.current,
            progressPct: performance_key_results_schema_1.keyResults.progressPct,
            isArchived: performance_key_results_schema_1.keyResults.isArchived,
        })
            .from(performance_key_results_schema_1.keyResults)
            .where((0, drizzle_orm_1.eq)(performance_key_results_schema_1.keyResults.id, krId))
            .limit(1);
        if (!kr || kr.isArchived)
            throw new common_1.BadRequestException('Key Result not found or archived');
        const { computedCurrent, computedPct } = this.computeKrProgress(kr, dto);
        const lastPct = kr.progressPct ?? 0;
        if (!dto.allowRegression && computedPct < lastPct) {
            throw new common_1.BadRequestException(`Cannot decrease progress (${computedPct.toFixed(2)} < ${lastPct.toFixed(2)})`);
        }
        const [update] = await this.db
            .insert(schema_1.performanceGoalUpdates)
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
        await this.db
            .update(performance_key_results_schema_1.keyResults)
            .set({
            current: computedCurrent !== null ? String(computedCurrent) : kr.current,
            progressPct: Math.round(computedPct),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(performance_key_results_schema_1.keyResults.id, krId));
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
    async addObjectiveCheckin(objectiveId, dto, user) {
        const { id: userId } = user;
        const [obj] = await this.db
            .select({
            id: performance_objectives_schema_1.objectives.id,
            isArchived: performance_objectives_schema_1.objectives.isArchived,
            score: performance_objectives_schema_1.objectives.score,
        })
            .from(performance_objectives_schema_1.objectives)
            .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId))
            .limit(1);
        if (!obj || obj.isArchived)
            throw new common_1.BadRequestException('Objective not found or archived');
        const pct = dto.progressPct;
        if (pct < 0 || pct > 100)
            throw new common_1.BadRequestException('progressPct must be 0..100');
        if (!dto.allowRegression && obj.score != null && pct < obj.score) {
            throw new common_1.BadRequestException(`Cannot decrease progress (${pct} < ${obj.score})`);
        }
        const [update] = await this.db
            .insert(schema_1.performanceGoalUpdates)
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
            .update(performance_objectives_schema_1.objectives)
            .set({ score: Math.round(pct), updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId));
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
    async updateCheckinNote(updateId, note, user) {
        const { id: userId } = user;
        const [upd] = await this.db
            .select({
            id: schema_1.performanceGoalUpdates.id,
            createdBy: schema_1.performanceGoalUpdates.createdBy,
        })
            .from(schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(schema_1.performanceGoalUpdates.id, updateId))
            .limit(1);
        if (!upd)
            throw new common_1.BadRequestException('Check-in not found');
        if (upd.createdBy !== userId)
            throw new common_1.BadRequestException('You do not have permission to update this check-in');
        const [updated] = await this.db
            .update(schema_1.performanceGoalUpdates)
            .set({ note, createdAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.performanceGoalUpdates.id, updateId))
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
    async addComment(user, dto) {
        const { id: userId } = user;
        const { objectiveId, keyResultId, comment, isPrivate } = dto;
        this.assertXorTarget(objectiveId, keyResultId);
        if (objectiveId)
            await this.ensureObjectiveExists(objectiveId);
        if (keyResultId)
            await this.ensureKrExists(keyResultId);
        const [row] = await this.db
            .insert(schema_1.objectiveComments)
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
    async updateComment(commentId, user, content) {
        const { id: userId } = user;
        const [row] = await this.db
            .select({
            id: schema_1.objectiveComments.id,
            authorId: schema_1.objectiveComments.authorId,
        })
            .from(schema_1.objectiveComments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveComments.id, commentId))
            .limit(1);
        if (!row)
            throw new common_1.BadRequestException('Comment not found');
        if (row.authorId !== userId)
            throw new common_1.BadRequestException('You do not have permission to edit this comment');
        const [updated] = await this.db
            .update(schema_1.objectiveComments)
            .set({ comment: content, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveComments.id, commentId))
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
    async deleteComment(commentId, user) {
        const { id: userId } = user;
        const [row] = await this.db
            .select({
            id: schema_1.objectiveComments.id,
            authorId: schema_1.objectiveComments.authorId,
            objectiveId: schema_1.objectiveComments.objectiveId,
            keyResultId: schema_1.objectiveComments.keyResultId,
        })
            .from(schema_1.objectiveComments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveComments.id, commentId))
            .limit(1);
        if (!row)
            throw new common_1.BadRequestException('Comment not found');
        if (row.authorId !== userId)
            throw new common_1.BadRequestException('You do not have permission to delete this comment');
        await this.db
            .delete(schema_1.objectiveComments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveComments.id, commentId));
        await this.audit.logAction({
            action: 'delete',
            entity: 'objective_comment',
            entityId: commentId,
            userId,
            details: `Deleted comment ${commentId}`,
        });
        return { message: 'Comment deleted successfully' };
    }
    async uploadAttachment(dto, user) {
        const { id: userId, companyId } = user;
        const { objectiveId, keyResultId } = dto;
        this.assertXorTarget(objectiveId, keyResultId);
        if (objectiveId)
            await this.ensureObjectiveExists(objectiveId);
        if (keyResultId)
            await this.ensureKrExists(keyResultId);
        const folder = await this.getOrCreateFolder(companyId, 'OKR Attachments');
        const [meta, base64Data] = dto.file.base64.split(',');
        const mimeMatch = meta.match(/data:(.*);base64/);
        const mimeType = mimeMatch?.[1];
        if (!mimeType || !base64Data)
            throw new common_1.BadRequestException('Invalid file format');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `company-files/${companyId}/${folder.id}/${Date.now()}-${dto.file.name}`;
        const { url } = await this.s3.uploadBuffer(buffer, key, companyId, 'okr_attachment', 'attachment', mimeType);
        const [row] = await this.db
            .insert(schema_1.objectiveAttachments)
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
    async updateAttachment(attachmentId, user, dto) {
        const { id: userId, companyId } = user;
        const [att] = await this.db
            .select({
            id: schema_1.objectiveAttachments.id,
            uploadedById: schema_1.objectiveAttachments.uploadedById,
            fileUrl: schema_1.objectiveAttachments.fileUrl,
            fileName: schema_1.objectiveAttachments.fileName,
        })
            .from(schema_1.objectiveAttachments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveAttachments.id, attachmentId))
            .limit(1);
        if (!att)
            throw new common_1.BadRequestException('Attachment not found');
        if (att.uploadedById !== userId)
            throw new common_1.BadRequestException('You do not have permission to update this attachment');
        let fileName = att.fileName;
        let fileUrl = att.fileUrl;
        if (dto.file) {
            const [meta, base64Data] = dto.file.base64.split(',');
            const mimeMatch = meta.match(/data:(.*);base64/);
            const mimeType = mimeMatch?.[1];
            if (!mimeType || !base64Data)
                throw new common_1.BadRequestException('Invalid file format');
            const buffer = Buffer.from(base64Data, 'base64');
            const key = `company-files/${companyId}/OKR Attachments/${Date.now()}-${dto.file.name}`;
            const uploaded = await this.s3.uploadBuffer(buffer, key, companyId, 'okr_attachment', 'attachment', mimeType);
            fileName = dto.file.name;
            fileUrl = uploaded.url;
        }
        const [updated] = await this.db
            .update(schema_1.objectiveAttachments)
            .set({
            fileUrl,
            fileName,
            comment: dto.comment ?? null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveAttachments.id, attachmentId))
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
    async deleteAttachment(attachmentId, user) {
        const { id: userId } = user;
        const [att] = await this.db
            .select({
            id: schema_1.objectiveAttachments.id,
            uploadedById: schema_1.objectiveAttachments.uploadedById,
            fileUrl: schema_1.objectiveAttachments.fileUrl,
        })
            .from(schema_1.objectiveAttachments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveAttachments.id, attachmentId))
            .limit(1);
        if (!att)
            throw new common_1.BadRequestException('Attachment not found');
        if (att.uploadedById !== userId)
            throw new common_1.BadRequestException('You do not have permission to delete this attachment');
        await this.s3.deleteFileFromS3(att.fileUrl);
        await this.db
            .delete(schema_1.objectiveAttachments)
            .where((0, drizzle_orm_1.eq)(schema_1.objectiveAttachments.id, attachmentId));
        await this.audit.logAction({
            action: 'delete',
            entity: 'objective_attachment',
            entityId: attachmentId,
            userId,
            details: `Deleted attachment ${attachmentId}`,
        });
        return { message: 'Attachment deleted successfully' };
    }
    computeKrProgress(kr, dto) {
        const num = (v) => (v === null || v === undefined ? null : Number(v));
        if (kr.type === 'metric' && kr.direction) {
            const baseline = num(kr.baseline);
            const target = num(kr.target);
            const minR = num(kr.minRange);
            const maxR = num(kr.maxRange);
            const current = dto.value !== undefined && dto.value !== null
                ? Number(dto.value)
                : num(kr.current);
            if (current === null)
                throw new common_1.BadRequestException('value is required for metric KR check-ins');
            let pct = 0;
            switch (kr.direction) {
                case 'increase_to':
                case 'at_least': {
                    if (baseline === null || target === null)
                        throw new common_1.BadRequestException('baseline/target required');
                    pct = (current - baseline) / (target - baseline);
                    break;
                }
                case 'decrease_to':
                case 'at_most': {
                    if (baseline === null || target === null)
                        throw new common_1.BadRequestException('baseline/target required');
                    pct = (baseline - current) / (baseline - target);
                    break;
                }
                case 'range': {
                    if (minR === null || maxR === null)
                        throw new common_1.BadRequestException('min/max range required');
                    if (current >= minR && current <= maxR)
                        pct = 1;
                    else {
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
        const pct = dto.progressPct;
        if (pct === undefined || pct === null) {
            throw new common_1.BadRequestException('progressPct is required for non-metric KR check-ins');
        }
        if (pct < 0 || pct > 100)
            throw new common_1.BadRequestException('progressPct must be 0..100');
        return { computedCurrent: null, computedPct: pct };
    }
    async recomputeObjectiveScore(objectiveId) {
        const rows = await this.db
            .select({
            weight: performance_key_results_schema_1.keyResults.weight,
            progressPct: performance_key_results_schema_1.keyResults.progressPct,
            isArchived: performance_key_results_schema_1.keyResults.isArchived,
        })
            .from(performance_key_results_schema_1.keyResults)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_key_results_schema_1.keyResults.objectiveId, objectiveId), (0, drizzle_orm_1.eq)(performance_key_results_schema_1.keyResults.isArchived, false)));
        if (rows.length === 0) {
            await this.db
                .update(performance_objectives_schema_1.objectives)
                .set({ score: null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId));
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
        const score = sumW > 0
            ? Math.round(acc / sumW)
            : Math.round(rows.reduce((a, r) => a + (r.progressPct ?? 0), 0) / rows.length);
        await this.db
            .update(performance_objectives_schema_1.objectives)
            .set({ score, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId));
    }
    async ensureObjectiveExists(objectiveId) {
        const [obj] = await this.db
            .select({ id: performance_objectives_schema_1.objectives.id, isArchived: performance_objectives_schema_1.objectives.isArchived })
            .from(performance_objectives_schema_1.objectives)
            .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId))
            .limit(1);
        if (!obj || obj.isArchived)
            throw new common_1.BadRequestException('Objective not found or archived');
    }
    async ensureKrExists(krId) {
        const [kr] = await this.db
            .select({ id: performance_key_results_schema_1.keyResults.id, isArchived: performance_key_results_schema_1.keyResults.isArchived })
            .from(performance_key_results_schema_1.keyResults)
            .where((0, drizzle_orm_1.eq)(performance_key_results_schema_1.keyResults.id, krId))
            .limit(1);
        if (!kr || kr.isArchived)
            throw new common_1.BadRequestException('Key Result not found or archived');
    }
    assertXorTarget(objectiveId, keyResultId) {
        const a = !!objectiveId;
        const b = !!keyResultId;
        if (a === b)
            throw new common_1.BadRequestException('Provide exactly one of objectiveId or keyResultId');
    }
    async getOrCreateFolder(companyId, name) {
        let [folder] = await this.db
            .select()
            .from(schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyFileFolders.name, name)));
        if (!folder) {
            [folder] = await this.db
                .insert(schema_1.companyFileFolders)
                .values({ companyId, name, createdAt: new Date() })
                .returning();
        }
        return folder;
    }
};
exports.GoalActivityService = GoalActivityService;
exports.GoalActivityService = GoalActivityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        s3_storage_service_1.S3StorageService])
], GoalActivityService);
//# sourceMappingURL=goal-activity.service.js.map