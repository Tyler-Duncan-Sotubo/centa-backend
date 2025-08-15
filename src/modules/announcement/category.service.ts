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

  private tags(companyId: string) {
    return [
      `company:${companyId}:announcements`,
      `company:${companyId}:announcement:categories`,
    ];
  }

  // Create new category
  async createCategory(name: string, user: User) {
    const [existing] = await this.db
      .select()
      .from(announcementCategories)
      .where(
        and(
          eq(announcementCategories.name, name),
          eq(announcementCategories.companyId, user.companyId),
        ),
      )
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

    // Invalidate cached category lists for this company
    await this.cache.bumpCompanyVersion(user.companyId);

    return newCategory;
  }

  // Update category
  async updateCategory(id: string, name: string, user: User) {
    const [existing] = await this.db
      .select()
      .from(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .execute();

    if (!existing) {
      throw new BadRequestException('Category not found');
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
      details: `Updated category ${id} to ${name} for company ${user.companyId}`,
      changes: {
        name: updated.name,
        companyId: updated.companyId,
      },
    });

    // Invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return updated;
  }

  // Delete category
  async deleteCategory(id: string, user: User) {
    const [existing] = await this.db
      .select()
      .from(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .execute();

    if (!existing) {
      throw new BadRequestException('Category not found');
    }

    await this.db
      .delete(announcementCategories)
      .where(eq(announcementCategories.id, id))
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'announcement_category',
      entityId: id,
      userId: user.id,
      details: `Deleted category ${id} for company ${user.companyId}`,
    });

    // Invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return { success: true };
  }

  // List categories for a company (cached)
  async listCategories(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['announcements', 'categories'],
      async () => {
        return this.db
          .select()
          .from(announcementCategories)
          .where(eq(announcementCategories.companyId, companyId))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }
}
