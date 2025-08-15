import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import { shifts } from '../schema/shifts.schema';
import { User } from 'src/common/types/user.type';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { companyLocations } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service'; // adjust path if needed

@Injectable()
export class ShiftsService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:attendance`,
      `company:${companyId}:attendance:shifts`,
    ];
  }

  async bulkCreate(companyId: string, rows: any[]) {
    // Utility to convert Excel time number → "HH:mm"
    const convertExcelTime = (value: any): string | undefined => {
      if (typeof value === 'number') {
        const totalMinutes = Math.round(value * 24 * 60);
        const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const minutes = String(totalMinutes % 60).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return typeof value === 'string' ? value : undefined;
    };

    // 1) Duplicate-name check
    const names = rows.map((r) => r['Name'] ?? r['name']).filter(Boolean);
    if (names.length === 0) {
      throw new BadRequestException('No valid rows to import.');
    }

    const duplicates = await this.db
      .select({ name: shifts.name })
      .from(shifts)
      .where(
        and(
          eq(shifts.companyId, companyId),
          eq(shifts.isDeleted, false),
          inArray(shifts.name, names),
        ),
      )
      .execute();

    if (duplicates.length) {
      const dupes = duplicates.map((d) => d.name).join(', ');
      throw new BadRequestException(`Shift names already exist: ${dupes}`);
    }

    // 2) Load company locations
    const locationList = await this.db
      .select({ id: companyLocations.id, name: companyLocations.name })
      .from(companyLocations)
      .where(eq(companyLocations.companyId, companyId))
      .execute();

    const locationMap = new Map(
      locationList.map((loc) => [loc.name.toLowerCase().trim(), loc.id]),
    );

    // 3) Map & validate each row
    const dtos: CreateShiftDto[] = [];

    for (const row of rows) {
      const rawDays = row['Working Days'] ?? row['workingDays'];
      let workingDays: string[];

      if (typeof rawDays === 'string') {
        try {
          workingDays = JSON.parse(rawDays);
        } catch {
          throw new BadRequestException(
            `Invalid WorkingDays format for "${row['Name'] ?? row['name']}": must be a JSON array`,
          );
        }
      } else {
        workingDays = rawDays;
      }

      // Map location name to ID
      let locationId: string | undefined;
      const locationNameRaw =
        row['Location Name'] ??
        row['locationName'] ??
        row[' locationName '] ??
        '';
      const locationName =
        typeof locationNameRaw === 'string' ? locationNameRaw.trim() : '';

      if (locationName) {
        const match = locationMap.get(locationName.toLowerCase());
        if (!match) {
          throw new BadRequestException(
            `Unknown location name "${locationName}" in row "${row['Name'] ?? row['name']}"`,
          );
        }
        locationId = match;
      }

      const dto = plainToInstance(CreateShiftDto, {
        name: row['Name'] ?? row['name'],
        startTime: convertExcelTime(row['Start Time'] ?? row['startTime']),
        endTime: convertExcelTime(row['End Time'] ?? row['endTime']),
        workingDays,
        lateToleranceMinutes:
          row['Late Tolerance Minutes'] !== undefined
            ? +row['Late Tolerance Minutes']
            : 10,
        allowEarlyClockIn:
          row['Allow Early ClockIn'] !== undefined
            ? Boolean(row['Allow Early ClockIn'])
            : false,
        earlyClockInMinutes:
          row['Early ClockIn Minutes'] !== undefined &&
          row['Early ClockIn Minutes'] !== null
            ? +row['Early ClockIn Minutes']
            : 0,
        allowLateClockOut:
          row['Allow Late ClockOut'] !== undefined
            ? Boolean(row['Allow Late ClockOut'])
            : false,
        lateClockOutMinutes:
          row['Late ClockOut Minutes'] !== undefined &&
          row['Late ClockOut Minutes'] !== null
            ? +row['Late ClockOut Minutes']
            : 0,
        notes: row['Notes'] ?? row['notes'],
      });

      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(
          `Invalid data in shift "${dto.name}": ${JSON.stringify(errors)}`,
        );
      }

      dtos.push({ ...dto, locationId });
    }

    // 4) Insert all in one transaction
    const inserted = await this.db.transaction(async (trx) => {
      const values = dtos.map((d) => ({ companyId, ...d }));
      return trx
        .insert(shifts)
        .values(values)
        .returning({
          id: shifts.id,
          name: shifts.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
        })
        .execute();
    });

    // bump company version so shift lists/details refresh
    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  async create(dto: CreateShiftDto, user: User, ip: string) {
    const [shift] = await this.db
      .insert(shifts)
      .values({ companyId: user.companyId, ...dto })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'time.shift',
      entityId: shift.id,
      details: 'Shift created',
      userId: user.id,
      ipAddress: ip,
      changes: {
        before: {},
        after: shift,
      },
    });

    // invalidate via version bump
    await this.cache.bumpCompanyVersion(user.companyId);

    return shift;
  }

  /**
   * Returns all non-deleted shifts for a company (joined with location name).
   * Cached under company:{id}:v{ver}:attendance:shifts:list
   */
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'shifts', 'list'],
      async () => {
        return this.db
          .select({
            id: shifts.id,
            name: shifts.name,
            startTime: shifts.startTime,
            endTime: shifts.endTime,
            workingDays: shifts.workingDays,
            lateToleranceMinutes: shifts.lateToleranceMinutes,
            allowEarlyClockIn: shifts.allowEarlyClockIn,
            earlyClockInMinutes: shifts.earlyClockInMinutes,
            allowLateClockOut: shifts.allowLateClockOut,
            lateClockOutMinutes: shifts.lateClockOutMinutes,
            locationName: companyLocations.name,
            locationId: shifts.locationId,
          })
          .from(shifts)
          .leftJoin(
            companyLocations,
            eq(shifts.locationId, companyLocations.id),
          )
          .where(
            and(eq(shifts.companyId, companyId), eq(shifts.isDeleted, false)),
          )
          .execute();
      },
    );
  }

  /**
   * Returns a single shift by id (non-deleted).
   * Cached under company:{id}:v{ver}:attendance:shifts:one:{id}
   */
  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'shifts', 'one', id],
      async () => {
        const [shift] = await this.db
          .select()
          .from(shifts)
          .where(
            and(
              eq(shifts.id, id),
              eq(shifts.companyId, companyId),
              eq(shifts.isDeleted, false),
            ),
          )
          .execute();

        if (!shift) {
          throw new BadRequestException(`Shift ${id} not found.`);
        }

        return shift;
      },
    );
  }

  async update(id: string, dto: UpdateShiftDto, user: User, ip: string) {
    // Fetch the "before" state
    const before = await this.findOne(id, user.companyId);

    // Update the shift
    const [after] = await this.db
      .update(shifts)
      .set({ ...dto })
      .where(
        and(
          eq(shifts.id, id),
          eq(shifts.companyId, user.companyId),
          eq(shifts.isDeleted, false),
        ),
      )
      .returning();

    // Log the action
    await this.auditService.logAction({
      action: 'update',
      entity: 'time.shift',
      details: 'Shift updated',
      entityId: id,
      userId: user.id,
      ipAddress: ip,
      changes: {
        before,
        after,
      },
    });

    // bump version so caches refresh
    await this.cache.bumpCompanyVersion(user.companyId);

    return after;
  }

  async remove(id: string, companyId: string) {
    // 404 if missing
    await this.findOne(id, companyId);

    // Soft delete
    await this.db
      .update(shifts)
      .set({ isDeleted: true })
      .where(
        and(
          eq(shifts.id, id),
          eq(shifts.companyId, companyId),
          eq(shifts.isDeleted, false),
        ),
      )
      .execute();

    // bump version so list/details refresh
    await this.cache.bumpCompanyVersion(companyId);

    return { success: true };
  }
}
