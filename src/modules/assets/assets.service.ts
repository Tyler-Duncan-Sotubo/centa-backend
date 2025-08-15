import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { UsefulLifeService } from './useful-life.service';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { assets } from './schema/assets.schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { companyLocations, employees } from '../core/schema';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBulkAssetDto } from './dto/create-bulk-asset.dto';
import { assetReports } from './schema/asset-reports.schema';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly usefulLifeService: UsefulLifeService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService, // 👈 inject cache
  ) {
    this.logger.setContext(AssetsService.name);
  }

  private tags(companyId: string) {
    return [`company:${companyId}:assets`, `company:${companyId}:assets:list`];
  }

  private categoryMap = {
    Laptop: 'L',
    Monitor: 'M',
    Phone: 'P',
    Furniture: 'F',
    Other: 'O',
  };

  // -------------------------- CREATE (single) --------------------------
  async create(dto: CreateAssetDto, user: User) {
    const existingAsset = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.serialNumber, dto.serialNumber),
          eq(assets.companyId, user.companyId),
        ),
      )
      .execute();

    if (existingAsset.length > 0) {
      throw new BadRequestException(
        `Asset with serial number ${dto.serialNumber} already exists.`,
      );
    }

    const usefulLife = await this.usefulLifeService.getUsefulLifeYears(
      dto.category,
      dto.name,
    );

    const existingCount = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(assets)
      .where(eq(assets.category, dto.category))
      .execute();

    const categoryCode = this.categoryMap[dto.category] || 'A';
    const year = new Date(dto.purchaseDate).getFullYear().toString().slice(-2);
    const sequenceNumber = (existingCount[0].count + 1)
      .toString()
      .padStart(3, '0');
    const internalId = `${categoryCode}${year}-${sequenceNumber}`;

    const depreciationMethod =
      dto.category === 'Furniture' ? 'DecliningBalance' : 'StraightLine';

    const assetData = {
      ...dto,
      usefulLifeYears: usefulLife,
      depreciationMethod,
      status: dto.employeeId ? 'assigned' : 'available',
      companyId: user.companyId,
      employeeId: dto.employeeId || null,
      locationId: dto.locationId,
      internalId,
    };

    const [newAsset] = await this.db
      .insert(assets)
      .values(assetData)
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'asset',
      entityId: newAsset.id,
      userId: user.id,
      changes: {
        name: newAsset.name,
        serialNumber: newAsset.serialNumber,
        category: newAsset.category,
        purchasePrice: newAsset.purchasePrice,
        purchaseDate: newAsset.purchaseDate,
        usefulLifeYears: newAsset.usefulLifeYears,
        depreciationMethod: newAsset.depreciationMethod,
        employeeId: newAsset.employeeId,
        locationId: newAsset.locationId,
      },
    });

    // write -> invalidate versioned caches
    await this.cache.bumpCompanyVersion(user.companyId);

    return newAsset;
  }

  // ----------------------- BULK CREATE (CSV/XLSX) -----------------------
  async bulkCreateAssets(companyId: string, rows: any[]) {
    this.logger.info(
      { companyId, rowCount: rows?.length ?? 0 },
      'bulkCreateAssets:start',
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException({ message: 'CSV has no rows' });
    }

    const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
    const sanitizeRow = (r: Record<string, any>) => {
      const out: Record<string, any> = {};
      for (const k of Object.keys(r)) out[k] = trim(r[k]);
      return out;
    };
    const toDateString = (v?: string) => {
      if (!v) return undefined;
      const raw = String(v).trim();
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
      const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      let y: number, m: number, d: number;
      if (iso.test(raw)) return raw;
      if (dmy.test(raw)) {
        const [, dd, mm, yyyy] = raw.match(dmy)!;
        y = +yyyy;
        m = +mm;
        d = +dd;
      } else if (mdy.test(raw)) {
        const [, mm, dd, yyyy] = raw.match(mdy)!;
        y = +yyyy;
        m = +mm;
        d = +dd;
      } else return undefined;
      const dt = new Date(Date.UTC(y, m - 1, d));
      return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
    };
    const toNumber = (v: any) => {
      if (v === null || v === undefined || v === '') return NaN;
      const n = Number(String(v).replace(/[, ]/g, ''));
      return Number.isFinite(n) ? n : NaN;
    };
    const normalizeLoc = (s: string) =>
      s
        .toLowerCase()
        .replace(/\b(branch|office)\b/g, '')
        .replace(/\s+/g, '')
        .trim();

    const firstKeys = Object.keys(rows[0] ?? {});
    this.logger.debug(
      `bulkCreateAssets: first row keys -> ${JSON.stringify(firstKeys)}`,
    );

    type Row = {
      'Asset Name': string;
      'Model Name'?: string;
      Color?: string;
      Specs?: string;
      Category: string;
      Manufacturer?: string;
      'Serial Number': string;
      'Purchase Price': string | number;
      'Purchase Date': string;
      'Warranty Expiry'?: string;
      'Employee Name'?: string;
      'Location Name': string;
      'Lend Date'?: string;
      'Return Date'?: string;
    };

    const allEmployees = await this.db
      .select({
        id: employees.id,
        fullName: sql<string>`LOWER(${employees.firstName} || ' ' || ${employees.lastName})`,
      })
      .from(employees)
      .where(eq(employees.companyId, companyId))
      .execute();
    const employeeMap = new Map(allEmployees.map((e) => [e.fullName, e.id]));

    const allLocations = await this.db
      .select({
        id: companyLocations.id,
        name: sql<string>`LOWER(${companyLocations.name})`,
      })
      .from(companyLocations)
      .where(eq(companyLocations.companyId, companyId))
      .execute();

    const locationKeyed = new Map(allLocations.map((l) => [l.name, l.id]));
    const locationFuzzy = new Map(
      allLocations.map((l) => [normalizeLoc(l.name), l.id]),
    );

    this.logger.debug(
      `bulkCreateAssets: preloaded employees=${allEmployees.length}, locations=${allLocations.length}`,
    );

    const errors: Array<{ index: number; name?: string; reason: string }> = [];
    const dtos: Array<
      CreateBulkAssetDto & {
        employeeId?: string;
        locationId: string;
        category: string;
        year: number;
      }
    > = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = sanitizeRow(rows[i] as Row);
      const name = (raw['Asset Name'] ?? '').toString();

      try {
        const category = (raw.Category ?? '').toString();
        const serial = (raw['Serial Number'] ?? '').toString();
        const price = toNumber(raw['Purchase Price']);
        const purchaseDate = toDateString(raw['Purchase Date']);

        const locationNameRaw = (raw['Location Name'] ?? '').toString();
        const exactKey = locationNameRaw.toLowerCase();
        let locationId = locationKeyed.get(exactKey);
        if (!locationId)
          locationId = locationFuzzy.get(normalizeLoc(locationNameRaw));

        if (!name) throw new Error(`"Asset Name" is required`);
        if (!category) throw new Error(`"Category" is required`);
        if (!serial) throw new Error(`"Serial Number" is required`);
        if (!Number.isFinite(price))
          throw new Error(`"Purchase Price" is invalid`);
        if (!purchaseDate)
          throw new Error(`"Purchase Date" is required/invalid`);
        if (!locationId)
          throw new Error(`Unknown "Location Name": ${locationNameRaw}`);

        let employeeId: string | undefined;
        const empNameRaw = (raw['Employee Name'] ?? '').toString();
        if (empNameRaw) {
          const empKey = empNameRaw.toLowerCase();
          employeeId = employeeMap.get(empKey);
        }

        const dto = plainToInstance(CreateBulkAssetDto, {
          name,
          modelName: raw['Model Name'] ?? '',
          color: raw.Color ?? '',
          specs: raw.Specs ?? '',
          category,
          manufacturer: raw.Manufacturer ?? '',
          serialNumber: serial,
          purchasePrice: String(price),
          purchaseDate,
          warrantyExpiry: toDateString(raw['Warranty Expiry']),
          lendDate: toDateString(raw['Lend Date']),
          returnDate: toDateString(raw['Return Date']),
        });

        const validationErrors = await validate(dto);
        if (validationErrors.length) {
          throw new Error(
            `Validation failed: ${JSON.stringify(validationErrors)}`,
          );
        }

        const year = new Date(dto.purchaseDate).getFullYear();
        dtos.push({ ...dto, employeeId, locationId, category, year });
      } catch (e: any) {
        errors.push({ index: i, name, reason: e?.message ?? 'Invalid row' });
      }
    }

    if (dtos.length === 0) {
      throw new BadRequestException({
        message: 'No valid rows in CSV',
        errors,
      });
    }

    const categoryMap: Record<string, string> = {
      Laptop: 'L',
      Monitor: 'M',
      Phone: 'P',
      Furniture: 'F',
      Other: 'O',
    };
    const depMap: Record<string, string> = {
      Laptop: 'StraightLine',
      Monitor: 'StraightLine',
      Phone: 'StraightLine',
      Furniture: 'DecliningBalance',
    };

    const prefixes = new Set<string>();
    for (const d of dtos) {
      const yy = String(d.year).slice(-2);
      const code =
        categoryMap[d.category] ?? d.category.charAt(0).toUpperCase();
      prefixes.add(`${code}${yy}-`);
    }

    const prefixNext = new Map<string, number>();
    for (const prefix of prefixes) {
      const existing = await this.db
        .select({ internalId: assets.internalId })
        .from(assets)
        .where(sql`${assets.internalId} LIKE ${prefix + '%'}`)
        .orderBy(sql`${assets.internalId} DESC`)
        .limit(500)
        .execute();

      let maxSeq = 0;
      for (const row of existing) {
        const m = row.internalId?.match(/^.+-(\d{3,})$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      }
      prefixNext.set(prefix, maxSeq + 1);
    }

    const inserted: (typeof assets.$inferSelect)[] = [];

    for (let i = 0; i < dtos.length; i++) {
      const d = dtos[i];
      const yy = String(d.year).slice(-2);
      const code =
        categoryMap[d.category] ?? d.category.charAt(0).toUpperCase();
      const prefix = `${code}${yy}-`;
      const next = prefixNext.get(prefix) ?? 1;
      const seq = String(next).padStart(3, '0');
      const internalId = `${prefix}${seq}`;

      const usefulLife = await this.usefulLifeService.getUsefulLifeYears(
        d.category,
        d.name,
      );
      const depreciationMethod = depMap[d.category] ?? 'StraightLine';

      try {
        const [asset] = await this.db
          .insert(assets)
          .values({
            companyId,
            name: d.name,
            modelName: d.modelName,
            color: d.color,
            specs: d.specs,
            category: d.category,
            manufacturer: d.manufacturer,
            serialNumber: d.serialNumber,
            purchasePrice: d.purchasePrice,
            purchaseDate: d.purchaseDate,
            warrantyExpiry: d.warrantyExpiry ?? null,
            employeeId: d.employeeId ?? null,
            locationId: d.locationId,
            lendDate: d.lendDate ?? null,
            returnDate: d.returnDate ?? null,
            usefulLifeYears: usefulLife,
            depreciationMethod,
            internalId,
            status: d.employeeId ? 'assigned' : 'available',
          })
          .returning()
          .execute();

        inserted.push(asset);
        prefixNext.set(prefix, next + 1);
      } catch (e: any) {
        errors.push({
          index: i,
          name: d.name,
          reason: e?.message ?? 'DB insert failed',
        });
      }
    }

    if (inserted.length === 0) {
      throw new BadRequestException({
        message: 'No assets were created from CSV',
        errors,
      });
    }

    // write -> invalidate versioned caches
    await this.cache.bumpCompanyVersion(companyId);

    return { insertedCount: inserted.length, inserted, errors };
  }

  // ------------------------------ LIST (CACHED) ------------------------------
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['assets', 'list'],
      async () => {
        return this.db
          .select({
            id: assets.id,
            name: assets.name,
            modelName: assets.modelName,
            color: assets.color,
            specs: assets.specs,
            category: assets.category,
            manufacturer: assets.manufacturer,
            serialNumber: assets.serialNumber,
            purchasePrice: assets.purchasePrice,
            purchaseDate: assets.purchaseDate,
            depreciationMethod: assets.depreciationMethod,
            usefulLifeYears: assets.usefulLifeYears,
            lendDate: assets.lendDate,
            returnDate: assets.returnDate,
            warrantyExpiry: assets.warrantyExpiry,
            employeeId: assets.employeeId,
            locationId: assets.locationId,
            assignedTo: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            assignedEmail: employees.email,
            location: companyLocations.name,
            status: assets.status,
            internalId: assets.internalId,
          })
          .from(assets)
          .leftJoin(employees, eq(assets.employeeId, employees.id))
          .innerJoin(
            companyLocations,
            eq(assets.locationId, companyLocations.id),
          )
          .where(
            and(
              eq(assets.companyId, companyId),
              eq(assets.isDeleted, false),
              isNull(assets.returnDate),
            ),
          )
          .orderBy(desc(assets.purchaseDate))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  // ------------------------------ GET ONE (UNCACHED) ------------------------------
  async findOne(id: string) {
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .execute();

    if (!asset) {
      throw new BadRequestException(`Asset with ID ${id} not found.`);
    }
    return asset;
  }

  // --------------------------- BY EMPLOYEE (UNCACHED) ---------------------------
  async findByEmployeeId(employeeId: string) {
    // kept uncached because we don’t have companyId in the signature for versioning
    const assetsByEmployee = await this.db
      .select({
        id: assets.id,
        name: assets.name,
        modelName: assets.modelName,
        category: assets.category,
        serialNumber: assets.serialNumber,
        lendDate: assets.lendDate,
        location: companyLocations.name,
        status: assets.status,
        internalId: assets.internalId,
        hasReport: sql<boolean>`EXISTS (
          SELECT 1
          FROM ${assetReports} ar
          WHERE ar.asset_id = ${assets.id}
        )`.as('hasReport'),
      })
      .from(assets)
      .leftJoin(employees, eq(assets.employeeId, employees.id))
      .leftJoin(assetReports, eq(assets.id, assetReports.assetId))
      .innerJoin(companyLocations, eq(assets.locationId, companyLocations.id))
      .where(
        and(eq(assets.employeeId, employeeId), eq(assets.isDeleted, false)),
      )
      .orderBy(desc(assets.purchaseDate))
      .execute();

    return assetsByEmployee;
  }

  // ------------------------------ UPDATE (BUMP) ------------------------------
  update(id: string, updateAssetDto: UpdateAssetDto, user: User) {
    return this.db.transaction(async (tx) => {
      const [existingAsset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, id))
        .execute();

      if (!existingAsset) {
        throw new BadRequestException(`Asset with ID ${id} not found.`);
      }

      const [updatedAsset] = await tx
        .update(assets)
        .set({
          ...updateAssetDto,
          status: updateAssetDto.employeeId ? 'assigned' : 'available',
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(assets.id, id), eq(assets.companyId, user.companyId)))
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'update',
        entity: 'asset',
        entityId: updatedAsset.id,
        userId: user.id,
        changes: { id: updatedAsset.id },
      });

      // write -> invalidate
      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedAsset;
    });
  }

  // -------------------------- REQUEST RETURN --------------------------
  async requestReturn(id: string) {
    const [existingAsset] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .execute();
    if (!existingAsset) {
      throw new BadRequestException(`Asset with ID ${id} not found.`);
    }
    if (existingAsset.returnDate) {
      throw new BadRequestException(
        `Asset with ID ${id} has already been returned.`,
      );
    }
    // TODO: Implement notification logic
  }

  // --------------------------- CHANGE STATUS (BUMP) ---------------------------
  async changeStatus(id: string, status: string, user: User) {
    await this.findOne(id);

    const [updatedAsset] = await this.db
      .update(assets)
      .set({
        status,
        employeeId: this.shouldAssignToEmployee(status) ? user.id : null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, user.companyId)))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'change_status',
      entity: 'asset',
      entityId: updatedAsset.id,
      userId: user.id,
      changes: {
        id: updatedAsset.id,
        status: updatedAsset.status,
      },
    });

    // write -> invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return updatedAsset;
  }

  // ------------------------------ REMOVE (BUMP) ------------------------------
  remove(id: string, user: User) {
    return this.db.transaction(async (tx) => {
      const [existingAsset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, id))
        .execute();

      if (!existingAsset) {
        throw new BadRequestException(`Asset with ID ${id} not found.`);
      }

      await tx
        .update(assets)
        .set({
          isDeleted: true,
          updatedAt: new Date().toDateString(),
        })
        .where(eq(assets.id, id))
        .execute();

      await this.auditService.logAction({
        action: 'delete',
        entity: 'asset',
        entityId: existingAsset.id,
        userId: user.id,
        changes: {
          id: existingAsset.id,
          name: existingAsset.name,
          serialNumber: existingAsset.serialNumber,
        },
      });

      // write -> invalidate
      await this.cache.bumpCompanyVersion(user.companyId);

      return { message: `Asset with ID ${id} deleted successfully.` };
    });
  }

  private shouldAssignToEmployee(status: string): boolean {
    const unassignedStatuses = ['available', 'maintenance', 'lost', 'retired'];
    return !unassignedStatuses.includes(status);
  }
}
