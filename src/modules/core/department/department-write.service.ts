// src/modules/core/departments/department-bulk-import.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { and, eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { departments } from 'src/drizzle/schema';

import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

type Row = Record<string, any>;

type ParsedRow = {
  index: number;
  raw: Row;
  name: string;
  nameKey: string;
  description?: string;
  parentDepartmentId?: string;
  costCenterId?: string;
};

@Injectable()
export class DepartmentWriteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async bulkCreate(companyId: string, rows: Row[]) {
    this.ensureRows(rows);

    const parsed = this.parseRows(rows);

    this.throwIfMissingNames(parsed);
    this.throwIfCsvDuplicates(parsed);

    const dtos = await this.validateRows(parsed);

    await this.throwIfExistingInDb(
      companyId,
      dtos.map((d) => d.name),
    );

    const inserted = await this.insertDepartments(companyId, dtos);

    await this.postWrite(companyId);

    return inserted;
  }

  // -----------------------------
  // Steps
  // -----------------------------
  private ensureRows(rows: Row[]) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException('No valid rows to import.');
    }
  }

  private parseRows(rows: Row[]): ParsedRow[] {
    return rows.map((row, index) => {
      const name = this.asString(this.pick(row, 'Name', 'name'));
      const description = this.asString(
        this.pick(row, 'Description', 'description'),
      );
      const parentDepartmentId = this.asString(
        this.pick(row, 'ParentDepartmentId', 'parentDepartmentId'),
      );
      const costCenterId = this.asString(
        this.pick(row, 'CostCenterId', 'costCenterId'),
      );

      return {
        index,
        raw: row,
        name: name ?? '',
        nameKey: name ? this.normalizeName(name) : '',
        description,
        parentDepartmentId,
        costCenterId,
      };
    });
  }

  private throwIfMissingNames(parsed: ParsedRow[]) {
    const missing = parsed.filter((p) => !p.nameKey);
    if (missing.length) {
      throw new BadRequestException({
        message: 'Invalid data in bulk upload: some rows are missing Name',
        missingNameRowIndexes: missing.map((r) => r.index),
      });
    }
  }

  private throwIfCsvDuplicates(parsed: ParsedRow[]) {
    const seen = new Map<string, number>();
    const dupMap = new Map<string, number[]>();

    for (const p of parsed) {
      const key = p.nameKey;
      if (!seen.has(key)) {
        seen.set(key, p.index);
      } else {
        const first = seen.get(key)!;
        const rows = dupMap.get(key) ?? [first];
        rows.push(p.index);
        dupMap.set(key, rows);
      }
    }

    if (!dupMap.size) return;

    const duplicates = [...dupMap.entries()].map(([key, idxs]) => {
      const displayName = parsed.find((p) => p.nameKey === key)!.name;
      return { name: displayName, rows: idxs };
    });

    throw new BadRequestException({
      message: 'Duplicate department names found in the CSV.',
      duplicates,
    });
  }

  private async validateRows(parsed: ParsedRow[]) {
    const dtos: CreateDepartmentDto[] = [];
    const issues: Array<{ rowIndex: number; name: string; errors: any[] }> = [];

    for (const p of parsed) {
      const dto = plainToInstance(CreateDepartmentDto, {
        name: p.name,
        description: p.description,
        parentDepartmentId: p.parentDepartmentId,
        costCenterId: p.costCenterId,
      });

      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length) {
        issues.push({
          rowIndex: p.index,
          name: p.name,
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

  private async throwIfExistingInDb(companyId: string, names: string[]) {
    const existing = await this.db
      .select({ name: departments.name })
      .from(departments)
      .where(
        and(
          eq(departments.companyId, companyId),
          inArray(departments.name, names),
        ),
      )
      .execute();

    if (existing.length) {
      throw new BadRequestException(
        `Department names already exist: ${existing.map((d) => d.name).join(', ')}`,
      );
    }
  }

  private async insertDepartments(
    companyId: string,
    dtos: CreateDepartmentDto[],
  ) {
    return this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({
        companyId,
        name: d.name,
        description: d.description,
        parentDepartmentId: d.parentDepartmentId,
        costCenterId: d.costCenterId,
      }));

      return trx
        .insert(departments)
        .values(values)
        .returning({
          id: departments.id,
          name: departments.name,
          description: departments.description,
        })
        .execute();
    });
  }

  private async postWrite(companyId: string) {
    await Promise.all([
      this.companySettings.setSetting(
        companyId,
        'onboarding_departments',
        true,
      ),
      this.cache.bumpCompanyVersion(companyId),
    ]);
  }

  // -----------------------------
  // Low-level helpers
  // -----------------------------
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

  private normalizeName(name: string) {
    // Align this with whatever uniqueness rule you want
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private formatValidationErrors(errors: ValidationError[]) {
    return errors.map((e) => ({
      property: e.property,
      constraints: e.constraints,
      children: e.children?.length ? e.children : undefined,
    }));
  }
}
