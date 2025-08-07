import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { asc, eq, or, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  termination_checklist_items,
  termination_reasons,
  termination_types,
} from '../schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { OffboardingChecklistItemDto } from './dto/offboarding-checklist.dto';
import { CreateOffboardingConfigDto } from './dto/create-offboarding-config.dto';
import { UpdateOffboardingConfigDto } from './dto/update-offboarding-config.dto';

@Injectable()
export class OffboardingConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // GET ALL CONFIGS
  async getAllTerminationConfig(companyId: string) {
    const [types, reasons, checklist] = await Promise.all([
      this.db
        .select()
        .from(termination_types)
        .where(
          or(
            eq(termination_types.companyId, companyId),
            eq(termination_types.isGlobal, true),
          ),
        ),

      this.db
        .select()
        .from(termination_reasons)
        .where(
          or(
            eq(termination_reasons.companyId, companyId),
            eq(termination_reasons.isGlobal, true),
          ),
        ),

      this.db
        .select()
        .from(termination_checklist_items)
        .where(
          or(
            eq(termination_checklist_items.companyId, companyId),
            eq(termination_checklist_items.isGlobal, true),
          ),
        )
        .orderBy(asc(termination_checklist_items.order)),
    ]);

    return {
      types,
      reasons,
      checklist,
    };
  }

  // ---------------- TYPES --------------------
  async createType(user: User, dto: CreateOffboardingConfigDto) {
    const { companyId, id: userId } = user;
    const exists = await this.db.query.termination_types.findFirst({
      where: (t, { eq }) => eq(t.name, dto.name),
    });

    if (exists) {
      throw new BadRequestException(
        `Termination type "${dto.name}" already exists.`,
      );
    }

    const type = await this.db
      .insert(termination_types)
      .values({ ...dto, companyId })
      .returning();

    // Log the creation in the audit service
    await this.auditService.logAction({
      action: 'create',
      entity: 'termination_type',
      entityId: type[0].id,
      userId,
      details: 'Created termination type: ' + name,
      changes: { name, companyId },
    });

    return type;
  }

  async updateType(id: string, dto: UpdateOffboardingConfigDto, user: User) {
    const exists = await this.db.query.termination_types.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Termination type with ID ${id} does not exist.`,
      );
    }

    const updated = await this.db
      .update(termination_types)
      .set({ name: dto.name, description: dto.description ?? null })
      .where(eq(termination_types.id, id))
      .returning();

    // Log the update in the audit service
    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_type',
      entityId: id,
      userId: user.id,
      details: 'Updated termination type: ' + name,
      changes: { name },
    });

    return updated;
  }

  async deleteType(id: string, user: User) {
    const exists = await this.db.query.termination_types.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Termination type with ID ${id} does not exist.`,
      );
    }

    await this.db.delete(termination_types).where(eq(termination_types.id, id));

    // Log the deletion in the audit service
    await this.auditService.logAction({
      action: 'delete',
      entity: 'termination_type',
      entityId: id,
      userId: user.id,
      details: 'Deleted termination type with ID: ' + id,
      changes: { id },
    });
  }

  // --------------- REASONS -------------------
  async createReason(user: User, dto: CreateOffboardingConfigDto) {
    const { companyId, id: userId } = user;
    const exists = await this.db.query.termination_reasons.findFirst({
      where: (r, { eq }) => eq(r.name, dto.name),
    });

    if (exists) {
      throw new BadRequestException(
        `Termination reason "${dto.name}" already exists.`,
      );
    }

    const reason = await this.db
      .insert(termination_reasons)
      .values({ ...dto, companyId })
      .returning();

    // Log the creation in the audit service
    await this.auditService.logAction({
      action: 'create',
      entity: 'termination_reason',
      entityId: reason[0].id,
      userId,
      details: 'Created termination reason: ' + dto.name,
      changes: { name: dto.name, companyId },
    });

    return reason;
  }

  async updateReason(id: string, dto: UpdateOffboardingConfigDto, user: User) {
    const exists = await this.db.query.termination_reasons.findFirst({
      where: (r, { eq }) => eq(r.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Termination reason with ID ${id} does not exist.`,
      );
    }

    const updated = await this.db
      .update(termination_reasons)
      .set({ name: dto.name, description: dto.description ?? null })
      .where(eq(termination_reasons.id, id))
      .returning();

    // Log the update in the audit service
    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_reason',
      entityId: id,
      userId: user.id,
      details: 'Updated termination reason: ' + name,
      changes: { name },
    });

    return updated;
  }

  async deleteReason(id: string, user: User) {
    const exists = await this.db.query.termination_reasons.findFirst({
      where: (r, { eq }) => eq(r.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Termination reason with ID ${id} does not exist.`,
      );
    }

    await this.db
      .delete(termination_reasons)
      .where(eq(termination_reasons.id, id));

    // Log the deletion in the audit service
    await this.auditService.logAction({
      action: 'delete',
      entity: 'termination_reason',
      entityId: id,
      userId: user.id,
      details: 'Deleted termination reason with ID: ' + id,
      changes: { id },
    });
  }

  // ----------- CHECKLIST ITEMS ---------------
  async createChecklistItem(user: User, dto: OffboardingChecklistItemDto) {
    const { companyId, id: userId } = user;

    const exists = await this.db.query.termination_checklist_items.findFirst({
      where: (i, { eq }) => eq(i.name, dto.name),
    });

    if (exists) {
      throw new BadRequestException(
        `Checklist item "${dto.name}" already exists.`,
      );
    }

    // Get the current highest order for this company
    const [last] = await this.db
      .select({ order: termination_checklist_items.order })
      .from(termination_checklist_items)
      .where(eq(termination_checklist_items.companyId, companyId))
      .orderBy(desc(termination_checklist_items.order))
      .limit(1);

    const nextOrder = (last?.order ?? 0) + 1;

    const [item] = await this.db
      .insert(termination_checklist_items)
      .values({
        ...dto,
        companyId,
        isGlobal: false,
        isAssetReturnStep: dto.isAssetReturnStep ?? false,
        order: nextOrder,
        createdAt: new Date(),
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'termination_checklist_item',
      entityId: item.id,
      userId,
      details: 'Created checklist item: ' + dto.name,
      changes: { ...dto },
    });

    return item;
  }

  async updateChecklistItem(
    id: string,
    data: OffboardingChecklistItemDto,
    user: User,
  ) {
    const exists = await this.db.query.termination_checklist_items.findFirst({
      where: (i, { eq }) => eq(i.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Checklist item with ID ${id} does not exist.`,
      );
    }

    const updateData = {
      name: data.name,
      description: data.description ?? null,
      isAssetReturnStep: data.isAssetReturnStep ?? false,
    };

    const [updated] = await this.db
      .update(termination_checklist_items)
      .set(updateData)
      .where(eq(termination_checklist_items.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'termination_checklist_item',
      entityId: id,
      userId: user.id,
      details: 'Updated checklist item: ' + data.name,
      changes: updateData,
    });

    return updated;
  }

  async deleteChecklistItem(id: string, user: User) {
    const exists = await this.db.query.termination_checklist_items.findFirst({
      where: (i, { eq }) => eq(i.id, id),
    });

    if (!exists) {
      throw new BadRequestException(
        `Checklist item with ID ${id} does not exist.`,
      );
    }

    await this.db
      .delete(termination_checklist_items)
      .where(eq(termination_checklist_items.id, id));

    // Log the deletion in the audit service
    await this.auditService.logAction({
      action: 'delete',
      entity: 'termination_checklist_item',
      entityId: id,
      userId: user.id,
      details: 'Deleted checklist item with ID: ' + id,
      changes: { id },
    });
  }
}
