import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { jobRoles } from '../schema';
import { eq, and } from 'drizzle-orm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class JobRolesService extends BaseCrudService<
  { title: string; level?: string; description?: string },
  typeof jobRoles
> {
  protected table = jobRoles;
  constructor(
    @Inject(DRIZZLE) db: db,
    audit: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {
    super(db, audit);
  }

  async create(companyId: string, dto: CreateJobRoleDto) {
    // Check if the job role already exists
    const existingJobRole = await this.db
      .select()
      .from(jobRoles)
      .where(
        and(eq(jobRoles.companyId, companyId), eq(jobRoles.title, dto.title)),
      )
      .execute();

    if (existingJobRole.length) {
      throw new NotFoundException('Job role already exists');
    }

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_job_roles',
      true,
    );

    return this.db
      .insert(jobRoles)
      .values({
        title: dto.title,
        level: dto.level,
        description: dto.description,
        companyId,
      })
      .returning({ id: jobRoles.id })
      .execute();
  }

  async bulkCreate(companyId: string, rows: any[]) {
    // Check if the job role already exists
    const existingJobRoles = await this.db
      .select()
      .from(jobRoles)
      .where(eq(jobRoles.companyId, companyId))
      .execute();

    const existingTitles = new Set(existingJobRoles.map((role) => role.title));
    const duplicateTitles = rows
      .map((row) => row['Title'] ?? row['title'])
      .filter((title) => existingTitles.has(title));
    if (duplicateTitles.length) {
      throw new BadRequestException(
        'Duplicate job roles found: ' + duplicateTitles.join(', '),
      );
    }

    // 1) Map & validate rows to DTOs
    const dtos: CreateJobRoleDto[] = [];
    for (const row of rows) {
      const dto = plainToInstance(CreateJobRoleDto, {
        title: row['Title'] ?? row['title'],
        level: row['Level'] ?? row['level'],
        description: row['Description'] ?? row['description'],
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(
          'Invalid data in bulk upload: ' + JSON.stringify(errors),
        );
      }
      dtos.push(dto);
    }

    // 2) Transaction insert
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        title: d.title,
        level: d.level,
        description: d.description,
      }));

      const result = await trx
        .insert(jobRoles)
        .values(values)
        .returning({ id: jobRoles.id, title: jobRoles.title })
        .execute();

      return result;
    });

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_job_roles',
      true,
    );

    return inserted;
  }

  async findAll(companyId: string) {
    return this.db
      .select()
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId)))
      .orderBy(jobRoles.title)
      .execute();
  }

  async findOne(companyId: string, id: string) {
    // Check if the job role exists
    const jobRole = await this.db
      .select()
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();
    if (!jobRole.length) {
      throw new NotFoundException('Job role not found');
    }
    return jobRole[0];
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateJobRoleDto,
    userId: string,
    ip: string,
  ) {
    return this.updateWithAudit(
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
  }

  async remove(companyId: string, id: string) {
    // Check if the job role exists
    const jobRole = await this.db
      .select()
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();
    if (!jobRole.length) {
      throw new NotFoundException('Job role not found');
    }
    return this.db
      .delete(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();
  }
}
