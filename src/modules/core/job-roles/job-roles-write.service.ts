// src/modules/core/job-roles/job-roles-write.service.ts
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { and, eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { jobRoles } from '../schema';

import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';

import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';

type Row = Record<string, any>;

type ParsedRow = {
  index: number;
  raw: Row;
  title: string;
  titleKey: string;
  level?: string;
  description?: string;
};

@Injectable()
export class JobRolesWriteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly companySettings: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  async create(companyId: string, dto: CreateJobRoleDto) {
    const title = this.asString(dto.title);
    if (!title) throw new BadRequestException('Title is required');

    const existing = await this.db
      .select({ id: jobRoles.id })
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.title, title)))
      .execute();

    if (existing.length) {
      throw new BadRequestException('Job role already exists');
    }

    const [created] = await this.db
      .insert(jobRoles)
      .values({
        title,
        level: dto.level,
        description: dto.description,
        companyId,
      })
      .returning({ id: jobRoles.id })
      .execute();

    await this.companySettings.setOnboardingTask(
      companyId,
      'company',
      'job_roles',
      'done',
    );

    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  async bulkCreate(companyId: string, rows: Row[]) {
    this.ensureRows(rows);

    const parsed = this.parseRows(rows);

    this.throwIfMissingTitles(parsed);
    this.throwIfCsvDuplicates(parsed);

    const dtos = await this.validateRows(parsed);

    // Efficient DB duplicate check (only check imported titles, not the whole table)
    await this.throwIfExistingInDb(
      companyId,
      dtos.map((d) => d.title),
    );

    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        title: d.title,
        level: d.level,
        description: d.description,
      }));

      return trx
        .insert(jobRoles)
        .values(values)
        .returning({ id: jobRoles.id, title: jobRoles.title })
        .execute();
    });

    await this.companySettings.setSetting(
      companyId,
      'onboarding_job_roles',
      true,
    );
    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  async update(companyId: string, id: string, dto: UpdateJobRoleDto) {
    // Keep this as a pure write operation; if you need audit, delegate from JobRolesService.
    const [existing] = await this.db
      .select({ id: jobRoles.id })
      .from(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();

    if (!existing) throw new NotFoundException('Job role not found');

    await this.db
      .update(jobRoles)
      .set({
        title: dto.title,
        level: dto.level,
        description: dto.description,
      })
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    return { id };
  }

  async remove(companyId: string, id: string) {
    const [deleted] = await this.db
      .delete(jobRoles)
      .where(and(eq(jobRoles.companyId, companyId), eq(jobRoles.id, id)))
      .returning({ id: jobRoles.id })
      .execute();

    if (!deleted) throw new NotFoundException('Job role not found');

    await this.cache.bumpCompanyVersion(companyId);

    return { id: deleted.id };
  }

  // -----------------------------
  // Parsing / validation helpers
  // -----------------------------

  private ensureRows(rows: Row[]) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No valid rows to import.');
    }
  }

  private parseRows(rows: Row[]): ParsedRow[] {
    return rows.map((row, index) => {
      const title = this.asString(this.pick(row, 'Title', 'title')) ?? '';
      const level = this.asString(this.pick(row, 'Level', 'level'));
      const description = this.asString(
        this.pick(row, 'Description', 'description'),
      );

      return {
        index,
        raw: row,
        title,
        titleKey: title ? this.normalizeKey(title) : '',
        level,
        description,
      };
    });
  }

  private throwIfMissingTitles(parsed: ParsedRow[]) {
    const missing = parsed.filter((p) => !p.titleKey);
    if (missing.length) {
      throw new BadRequestException({
        message: 'Invalid data in bulk upload: some rows are missing Title',
        missingTitleRowIndexes: missing.map((r) => r.index),
      });
    }
  }

  private throwIfCsvDuplicates(parsed: ParsedRow[]) {
    const seen = new Map<string, number>();
    const dupMap = new Map<string, number[]>();

    for (const p of parsed) {
      const key = p.titleKey;
      if (!seen.has(key)) {
        seen.set(key, p.index);
      } else {
        const first = seen.get(key)!;
        const arr = dupMap.get(key) ?? [first];
        arr.push(p.index);
        dupMap.set(key, arr);
      }
    }

    if (!dupMap.size) return;

    const duplicates = [...dupMap.entries()].map(([key, idxs]) => {
      const displayTitle = parsed.find((p) => p.titleKey === key)!.title;
      return { title: displayTitle, rows: idxs };
    });

    throw new BadRequestException({
      message: 'Duplicate job roles found in the CSV.',
      duplicates,
    });
  }

  private async validateRows(parsed: ParsedRow[]) {
    const dtos: CreateJobRoleDto[] = [];
    const issues: Array<{ rowIndex: number; title: string; errors: any[] }> =
      [];

    for (const p of parsed) {
      const dto = plainToInstance(CreateJobRoleDto, {
        title: p.title,
        level: p.level,
        description: p.description,
      });

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });
      if (errors.length) {
        issues.push({
          rowIndex: p.index,
          title: p.title,
          errors: this.formatValidationErrors(errors),
        });
      } else {
        dtos.push(dto);
      }
    }

    if (issues.length) {
      throw new BadRequestException({
        message: 'Invalid data in bulk upload.',
        issues,
      });
    }

    return dtos;
  }

  private async throwIfExistingInDb(companyId: string, titles: string[]) {
    const existing = await this.db
      .select({ title: jobRoles.title })
      .from(jobRoles)
      .where(
        and(eq(jobRoles.companyId, companyId), inArray(jobRoles.title, titles)),
      )
      .execute();

    if (existing.length) {
      throw new BadRequestException(
        'Duplicate job roles found: ' + existing.map((r) => r.title).join(', '),
      );
    }
  }

  private pick(row: Row, ...keys: string[]) {
    for (const k of keys) {
      const v = row?.[k];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  private asString(v: any) {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s.length ? s : undefined;
  }

  private normalizeKey(v: string) {
    return v.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private formatValidationErrors(errors: ValidationError[]) {
    return errors.map((e) => ({
      property: e.property,
      constraints: e.constraints,
      children: e.children?.length ? e.children : undefined,
    }));
  }
}
