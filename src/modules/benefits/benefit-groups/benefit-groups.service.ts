import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateBenefitGroupDto } from './dto/create-benefit-group.dto';
import { UpdateBenefitGroupDto } from './dto/update-benefit-group.dto';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { benefitGroups } from '../schema/benefit-groups.schema';
import { benefitPlans } from '../schema/benefit-plan.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class BenefitGroupsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:benefit-groups`,
      `company:${companyId}:benefit-groups:list`,
    ];
  }

  // -----------------------------
  // Create
  // -----------------------------
  async create(dto: CreateBenefitGroupDto, user: User) {
    // Uniqueness check
    const [existingGroup] = await this.db
      .select()
      .from(benefitGroups)
      .where(
        and(
          eq(benefitGroups.name, dto.name),
          eq(benefitGroups.companyId, user.companyId),
        ),
      )
      .execute();
    if (existingGroup) {
      throw new BadRequestException(
        'A benefit group with this name already exists.',
      );
    }

    const [newGroup] = await this.db
      .insert(benefitGroups)
      .values({
        ...dto,
        companyId: user.companyId,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'benefitGroup',
      entityId: newGroup.id,
      userId: user.id,
      details: 'Created benefit group',
      changes: {
        name: newGroup.name,
        description: newGroup.description,
        companyId: newGroup.companyId,
        createdAt: newGroup.createdAt,
      },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(user.companyId);

    return newGroup;
  }

  // -----------------------------
  // Read (all) — cached
  // -----------------------------
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['benefit-groups', 'all'],
      async () => {
        return this.db
          .select()
          .from(benefitGroups)
          .where(eq(benefitGroups.companyId, companyId))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  // -----------------------------
  // Read (one) — cached
  // (Use companyId so versioned cache invalidation works)
  // -----------------------------
  async findOne(companyId: string, id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['benefit-groups', 'one', id],
      async () => {
        const [group] = await this.db
          .select()
          .from(benefitGroups)
          .where(
            and(
              eq(benefitGroups.id, id),
              eq(benefitGroups.companyId, companyId),
            ),
          )
          .execute();

        if (!group) {
          throw new BadRequestException('Benefit group not found');
        }
        return group;
      },
      { tags: this.tags(companyId) },
    );
  }

  // -----------------------------
  // Update
  // -----------------------------
  async update(id: string, dto: UpdateBenefitGroupDto, user: User) {
    // Ensure it exists (and scopes by company)
    await this.findOne(user.companyId, id);

    const [updatedGroup] = await this.db
      .update(benefitGroups)
      .set({
        ...dto,
        companyId: user.companyId,
      })
      .where(
        and(
          eq(benefitGroups.id, id),
          eq(benefitGroups.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'benefitGroup',
      entityId: updatedGroup.id,
      userId: user.id,
      details: 'Updated benefit group',
      changes: {
        name: updatedGroup.name,
        description: updatedGroup.description,
        companyId: updatedGroup.companyId,
        createdAt: updatedGroup.createdAt,
      },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(user.companyId);

    return updatedGroup;
  }

  // -----------------------------
  // Delete
  // -----------------------------
  async remove(id: string, user: User) {
    // Ensure it exists
    await this.findOne(user.companyId, id);

    // Prevent delete if plans reference this group
    const existingPlans = await this.db
      .select()
      .from(benefitPlans)
      .where(eq(benefitPlans.benefitGroupId, id))
      .execute();

    if (existingPlans.length > 0) {
      throw new BadRequestException(
        'Cannot delete benefit group with existing benefit plans.',
      );
    }

    const [deletedGroup] = await this.db
      .delete(benefitGroups)
      .where(
        and(
          eq(benefitGroups.id, id),
          eq(benefitGroups.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'benefitGroup',
      entityId: deletedGroup.id,
      userId: user.id,
      details: 'Deleted benefit group',
      changes: {
        name: deletedGroup.name,
        description: deletedGroup.description,
        companyId: deletedGroup.companyId,
        createdAt: deletedGroup.createdAt,
      },
    });

    // Invalidate company-scoped caches
    await this.cache.bumpCompanyVersion(user.companyId);
  }
}
