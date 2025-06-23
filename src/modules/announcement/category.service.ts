import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { announcementCategories } from './schema/announcements.schema';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { User } from 'src/common/types/user.type';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  // Create new category
  async createCategory(name: string, user: User) {
    // Optional: enforce unique code per company
    const [existing] = await this.db
      .select()
      .from(announcementCategories)
      .where(eq(announcementCategories.name, name))
      .execute();

    if (existing) {
      throw new BadRequestException('Category code already exists');
    }

    const [newCategory] = await this.db
      .insert(announcementCategories)
      .values({
        companyId: user.companyId, // Assuming user has companyId
        name,
      })
      .returning()
      .execute();

    // Optionally log the creation in audit service
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

    return newCategory;
  }

  // Update category
  async updateCategory(id: string, name: string, user: User) {
    // Optional: validate category exists
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
      .set({
        name,
      })
      .where(eq(announcementCategories.id, id))
      .returning()
      .execute();

    // Log the update in audit service
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

    // Log the deletion in audit service
    await this.auditService.logAction({
      action: 'delete',
      entity: 'announcement_category',
      entityId: id,
      userId: user.id,
      details: `Deleted category ${id} for company ${user.companyId}`,
    });

    return { success: true };
  }

  // List categories for a company
  async listCategories(companyId: string) {
    return await this.db
      .select()
      .from(announcementCategories)
      .where(eq(announcementCategories.companyId, companyId))
      .execute();
  }
}
