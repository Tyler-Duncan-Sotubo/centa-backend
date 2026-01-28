// src/modules/core/job-roles/job-roles.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { jobRoles } from '../schema';
import { eq, and } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';

import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { JobRolesWriteService } from './job-roles-write.service';

@Injectable()
export class JobRolesService extends BaseCrudService<
  { title: string; level?: string; description?: string },
  typeof jobRoles
> {
  protected table = jobRoles;

  constructor(
    @Inject(DRIZZLE) db: db,
    audit: AuditService,
    private readonly cache: CacheService,
    private readonly write: JobRolesWriteService,
  ) {
    super(db, audit);
  }

  private tags(companyId: string) {
    return [`company:${companyId}:job-roles`];
  }

  // Writes delegated
  create(companyId: string, dto: CreateJobRoleDto) {
    return this.write.create(companyId, dto);
  }

  bulkCreate(companyId: string, rows: any[]) {
    return this.write.bulkCreate(companyId, rows);
  }

  // Reads stay here
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['job-roles', 'all'],
      () =>
        this.db
          .select()
          .from(jobRoles)
          .where(eq(jobRoles.companyId, companyId))
          .orderBy(jobRoles.title)
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  async findOne(companyId: string, id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['job-roles', 'one', id],
      async () => {
        const rows = await this.db
          .select()
          .from(jobRoles)
          .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
          .execute();
        if (!rows.length) throw new NotFoundException('Job role not found');
        return rows[0];
      },
      { tags: this.tags(companyId) },
    );
  }

  // Keep audit here (or move to write service if you want it audit-aware)
  async update(
    companyId: string,
    id: string,
    dto: UpdateJobRoleDto,
    userId: string,
    ip: string,
  ) {
    const result = await this.updateWithAudit(
      companyId,
      id,
      { title: dto.title, level: dto.level, description: dto.description },
      {
        entity: 'JobRole',
        action: 'UpdateJobRole',
        fields: ['title', 'level', 'description'],
      },
      userId,
      ip,
    );

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  // Delegate delete to write service (keeps cache invalidation in one place)
  remove(companyId: string, id: string) {
    return this.write.remove(companyId, id);
  }
}
