import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { announcementCategories } from './schema/announcements.schema';
import { eq, and } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ---------- cache keys ----------
  private categoriesKey(companyId: string) {
    return `company:${companyId}:announcement-categories`;
  }
  private async invalidateCategories(companyId: string) {
    await this.cache.del(this.categoriesKey(companyId));
  }

  // Create new category
  async createCategory(name: string, user: User) {
    // enforce unique name per company
    const [existing] = await this.db
      .select({ id: announcementCategories.id })
      .from(announcementCategories)
      .where(
        and(
          eq(announcementCategories.name, name),
          eq(announcementCategories.companyId, user.companyId),
        ),
      )
      .limit(1)
      .execute();

    if (existing) {
      throw new BadRequestException('Category name already exists');
    }

    const [newCategory] = await this.db
      .insert(announcementCategories)
      .values({
        companyId: user.companyId,
        name,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'announcement_category',
      entityId: newCategory.id,
      userId: user.id,
      details: `Created category ${name} for company ${user.companyId}`,
      changes: {
        name: newCategory.name,
        companyId: newCategory.companyId,
      },
    });

    // bust cache for the company’s category list
    await this.invalidateCategories(user.companyId);

    return newCategory;
  }

  // Update category
  async updateCategory(id: string, name: string, user: User) {
    // fetch existing to get companyId for cache invalidation
    const [existing] = await this.db
      .select({
        id: announcementCategories.id,
        companyId: announcementCategories.companyId,
        name: announcementCategories.name,
      })
      .from(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .limit(1)
      .execute();

    if (!existing) throw new BadRequestException('Category not found');

    // optional: enforce unique name within the same company
    if (name && name !== existing.name) {
      const [dup] = await this.db
        .select({ id: announcementCategories.id })
        .from(announcementCategories)
        .where(
          and(
            eq(announcementCategories.companyId, existing.companyId),
            eq(announcementCategories.name, name),
          ),
        )
        .limit(1)
        .execute();

      if (dup) throw new BadRequestException('Category name already exists');
    }

    const [updated] = await this.db
      .update(announcementCategories)
      .set({ name })
      .where(eq(announcementCategories.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'announcement_category',
      entityId: updated.id,
      userId: user.id,
      details: `Updated category ${id} to ${name} for company ${existing.companyId}`,
      changes: {
        name: updated.name,
        companyId: updated.companyId,
      },
    });

    // bust cache
    await this.invalidateCategories(existing.companyId);

    return updated;
  }

  // Delete category
  async deleteCategory(id: string, user: User) {
    // fetch to confirm + get companyId
    const [existing] = await this.db
      .select({
        id: announcementCategories.id,
        companyId: announcementCategories.companyId,
      })
      .from(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .limit(1)
      .execute();

    if (!existing) throw new BadRequestException('Category not found');

    await this.db
      .delete(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'announcement_category',
      entityId: id,
      userId: user.id,
      details: `Deleted category ${id} for company ${existing.companyId}`,
    });

    // bust cache
    await this.invalidateCategories(existing.companyId);

    return { success: true };
  }

  // List categories for a company (cached)
  async listCategories(companyId: string) {
    return this.cache.getOrSetCache(
      this.categoriesKey(companyId),
      async () => {
        return this.db
          .select()
          .from(announcementCategories)
          .where(eq(announcementCategories.companyId, companyId))
          .execute();
      },
      // { ttl: 120 } // uncomment if your CacheService supports TTL
    );
  }
}
