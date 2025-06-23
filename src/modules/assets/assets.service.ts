import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UsefulLifeService } from './useful-life.service';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from '../audit/audit.service';
import { assets } from './schema/assets.schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { companyLocations, employees } from '../core/schema';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBulkAssetDto } from './dto/create-bulk-asset.dto';
import { assetReports } from './schema/asset-reports.schema';

@Injectable()
export class AssetsService {
  constructor(
    private readonly usefulLifeService: UsefulLifeService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  private categoryMap = {
    Laptop: 'L',
    Monitor: 'M',
    Phone: 'P',
    Furniture: 'F',
    Other: 'O',
  };

  async create(dto: CreateAssetDto, user: User) {
    // check if asset with same serial number already exists
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

    // Get AI generated useful life
    const usefulLife = await this.usefulLifeService.getUsefulLifeYears(
      dto.category,
      dto.name,
    );

    const existingCount = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(assets)
      .where(eq(assets.category, dto.category));

    const categoryCode = this.categoryMap[dto.category] || 'A';
    const year = new Date(dto.purchaseDate).getFullYear().toString().slice(-2); // '25'
    const sequenceNumber = (existingCount[0].count + 1)
      .toString()
      .padStart(3, '0'); // '010'

    const internalId = `${categoryCode}${year}-${sequenceNumber}`; // e.g., 'L25-010'

    // Set default depreciation method if not provided
    const depreciationMethod = (() => {
      switch (dto.category) {
        case 'Laptop':
        case 'Monitor':
        case 'Phone':
          return 'StraightLine';
        case 'Furniture':
          return 'DecliningBalance'; // or 'StraightLine' based on your policy
        default:
          return 'StraightLine';
      }
    })();

    const assetData = {
      ...dto,
      usefulLifeYears: usefulLife,
      depreciationMethod: depreciationMethod,
      status: dto.employeeId ? 'assigned' : 'available',
      companyId: user.companyId,
      employeeId: dto.employeeId || null,
      locationId: dto.locationId,
      internalId: internalId,
    };
    // Insert asset into the database
    const [newAsset] = await this.db
      .insert(assets)
      .values(assetData)
      .returning()
      .execute();
    // Log the creation in the audit service
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
    return newAsset;
  }

  async bulkCreateAssets(companyId: string, rows: any[]) {
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

    // Preload employees
    const allEmployees = await this.db
      .select({
        id: employees.id,
        fullName: sql<string>`LOWER(${employees.firstName} || ' ' || ${employees.lastName})`,
      })
      .from(employees)
      .where(eq(employees.companyId, companyId));

    const employeeMap = new Map(
      allEmployees.map((e) => [e.fullName.toLowerCase(), e.id]),
    );

    // Preload office locations
    const allLocations = await this.db
      .select({
        id: companyLocations.id,
        name: sql<string>`LOWER(${companyLocations.name})`,
      })
      .from(companyLocations)
      .where(eq(companyLocations.companyId, companyId));

    const locationMap = new Map(
      allLocations.map((l) => [l.name.toLowerCase(), l.id]),
    );

    const dtos: (CreateBulkAssetDto & {
      employeeId?: string;
      locationId: string;
    })[] = [];

    const existingCounts = new Map<string, number>();

    for (const dto of dtos) {
      const year = new Date(dto.purchaseDate)
        .getFullYear()
        .toString()
        .slice(-2);
      const prefix = `${dto.category}-${year}`;
      if (!existingCounts.has(prefix)) {
        const [{ count }] = await this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(assets)
          .where(
            and(
              eq(assets.companyId, companyId),
              eq(assets.category, dto.category),
              sql`EXTRACT(YEAR FROM ${assets.purchaseDate}) = ${Number('20' + year)}`,
            ),
          );
        existingCounts.set(prefix, Number(count));
      }
    }

    for (const row of rows as Row[]) {
      const employeeName = row['Employee Name']?.trim().toLowerCase();
      const employeeId = employeeName
        ? employeeMap.get(employeeName)
        : undefined;

      if (employeeName && !employeeId) {
        console.warn(`Skipping row with unknown employee: ${employeeName}`);
        continue;
      }

      const locationName = row['Location Name']?.trim().toLowerCase();
      const locationId = locationMap.get(locationName);

      if (!locationId) {
        console.warn(`Skipping row with unknown location: ${locationName}`);
        continue;
      }

      const dto = plainToInstance(CreateBulkAssetDto, {
        name: row['Asset Name'],
        modelName: row['Model Name'],
        color: row['Color'],
        specs: row['Specs'],
        category: row['Category'],
        manufacturer: row['Manufacturer'],
        serialNumber: row['Serial Number'],
        purchasePrice: String(row['Purchase Price']),
        purchaseDate: row['Purchase Date'],
        warrantyExpiry: row['Warranty Expiry'] || undefined,
        lendDate: row['Lend Date'] || undefined,
        returnDate: row['Return Date'] || undefined,
      });

      const errors = await validate(dto);
      if (errors.length) {
        console.warn(`❌ Skipping invalid asset row:`, errors);
        continue;
      }

      dtos.push({ ...dto, employeeId, locationId });
    }

    const inserted = await this.db.transaction(async (trx) => {
      const insertedAssets: (typeof assets.$inferSelect)[] = [];

      // Parallel fetch useful life years
      const usefulLifePromises = dtos.map((dto) =>
        this.usefulLifeService.getUsefulLifeYears(dto.category, dto.name),
      );
      const usefulLives = await Promise.all(usefulLifePromises);

      for (let i = 0; i < dtos.length; i++) {
        const dto = dtos[i];

        const category = dto.category;
        // Before the loop, preload count from the DB:

        const categoryCode =
          this.categoryMap?.[category] || category.charAt(0).toUpperCase();
        const year = new Date(dto.purchaseDate)
          .getFullYear()
          .toString()
          .slice(-2);

        const prefix = `${dto.category}-${year}`;
        const count = existingCounts.get(prefix) || 0;
        existingCounts.set(prefix, count + 1);

        const sequenceNumber = (count + 1).toString().padStart(3, '0');
        const internalId = `${categoryCode}${year}-${sequenceNumber}`;
        const depreciationMap: Record<string, string> = {
          Laptop: 'StraightLine',
          Monitor: 'StraightLine',
          Phone: 'StraightLine',
          Furniture: 'DecliningBalance',
        };
        const depreciationMethod =
          depreciationMap[dto.category] || 'StraightLine';

        const usefulLife = usefulLives[i];

        const [asset] = await trx
          .insert(assets)
          .values({
            companyId,
            name: dto.name,
            modelName: dto.modelName,
            color: dto.color,
            specs: dto.specs,
            category: dto.category,
            manufacturer: dto.manufacturer,
            serialNumber: dto.serialNumber,
            purchasePrice: dto.purchasePrice,
            purchaseDate: dto.purchaseDate,
            warrantyExpiry: dto.warrantyExpiry,
            employeeId: dto.employeeId ?? null,
            locationId: dto.locationId,
            lendDate: dto.lendDate?.toString(),
            returnDate: dto.returnDate?.toString(),
            usefulLifeYears: usefulLife,
            depreciationMethod,
            internalId,
            status: dto.employeeId ? 'assigned' : 'available',
          })
          .returning()
          .execute();

        insertedAssets.push(asset);
      }

      return insertedAssets;
    });

    return inserted;
  }

  async findAll(companyId: string) {
    const allAssets = await this.db
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
      .innerJoin(companyLocations, eq(assets.locationId, companyLocations.id))
      .where(
        and(
          eq(assets.companyId, companyId),
          eq(assets.isDeleted, false),
          isNull(assets.returnDate),
        ),
      )
      .orderBy(desc(assets.purchaseDate))
      .execute();

    return allAssets;
  }

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

  async findByEmployeeId(employeeId: string) {
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

  update(id: string, updateAssetDto: UpdateAssetDto, user: User) {
    // Check if asset exists
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

      // Log the update in the audit service
      await this.auditService.logAction({
        action: 'update',
        entity: 'asset',
        entityId: updatedAsset.id,
        userId: user.id,
        changes: {
          id: updatedAsset.id,
        },
      });

      return updatedAsset;
    });
  }

  // request return of an asset
  async requestReturn(id: string) {
    // Check if asset exists
    const [existingAsset] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id))
      .execute();
    if (!existingAsset) {
      throw new BadRequestException(`Asset with ID ${id} not found.`);
    }
    // Check if asset is already returned
    if (existingAsset.returnDate) {
      throw new BadRequestException(
        `Asset with ID ${id} has already been returned.`,
      );
    }

    // Send request to the employee // TODO: Implement notification logic
  }

  // change the status of an asset
  async changeStatus(id: string, status: string, user: User) {
    // Check if asset exists
    await this.findOne(id);

    // Update asset status
    const [updatedAsset] = await this.db
      .update(assets)
      .set({
        status: status,
        employeeId: this.shouldAssignToEmployee(status) ? user.id : null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(assets.id, id), eq(assets.companyId, user.companyId)))
      .returning()
      .execute();

    // Log the status change in the audit service
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
    return updatedAsset;
  }

  remove(id: string, user: User) {
    return this.db.transaction(async (tx) => {
      // Check if asset exists
      const [existingAsset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, id))
        .execute();

      if (!existingAsset) {
        throw new BadRequestException(`Asset with ID ${id} not found.`);
      }

      // Delete asset
      await tx
        .update(assets)
        .set({
          isDeleted: true,
          updatedAt: new Date().toDateString(),
        })
        .where(eq(assets.id, id))
        .execute();

      // Log the deletion in the audit service
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

      return { message: `Asset with ID ${id} deleted successfully.` };
    });
  }

  private shouldAssignToEmployee(status: string): boolean {
    const unassignedStatuses = ['available', 'maintenance', 'lost', 'retired'];
    return !unassignedStatuses.includes(status);
  }
}
