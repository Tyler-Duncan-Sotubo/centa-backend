import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuditService } from 'src/modules/audit/audit.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray, not, sql } from 'drizzle-orm';
import { shifts } from '../schema/shifts.schema';
import { User } from 'src/common/types/user.type';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { companyLocations } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { PinoLogger } from 'nestjs-pino';

type ParsedTime = { hhmm: string; minutes: number };

@Injectable()
export class ShiftsService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ShiftsService.name);
  }

  // ---------- cache keys + helpers ----------
  private listKey(companyId: string) {
    // single key for all list variants so one del() bursts everything
    return `company:${companyId}:shifts:list`;
  }
  private oneKey(shiftId: string) {
    return `shift:${shiftId}:detail`;
  }
  private async invalidateAfterChange(opts: {
    companyId: string;
    shiftId?: string;
  }) {
    const jobs = [this.cache.del(this.listKey(opts.companyId))];
    if (opts.shiftId) jobs.push(this.cache.del(this.oneKey(opts.shiftId)));
    await Promise.allSettled(jobs);
  }

  // ---------- utils ----------
  private readonly VALID_DAYS = new Set([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]);

  private parseTime(input?: string | number): ParsedTime | undefined {
    if (input == null) return undefined;

    if (typeof input === 'number') {
      // Excel serial time (0..1)
      const totalMinutes = Math.round(input * 24 * 60);
      const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const m = String(totalMinutes % 60).padStart(2, '0');
      return { hhmm: `${h}:${m}`, minutes: totalMinutes };
    }

    const trimmed = String(input).trim();

    // Accept "9:00" / "09:00"
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [hStr, mStr] = trimmed.split(':');
      const h = Number(hStr);
      const m = Number(mStr);
      if (h < 0 || h > 23 || m < 0 || m > 59)
        throw new BadRequestException(`Invalid time: ${input}`);
      return {
        hhmm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        minutes: h * 60 + m,
      };
    }

    // Accept "9" / "9.5"
    if (/^\d{1,2}(\.\d+)?$/.test(trimmed)) {
      const hoursFloat = Number(trimmed);
      if (hoursFloat < 0 || hoursFloat >= 24)
        throw new BadRequestException(`Invalid time: ${input}`);
      const totalMinutes = Math.round(hoursFloat * 60);
      const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const m = String(totalMinutes % 60).padStart(2, '0');
      return { hhmm: `${h}:${m}`, minutes: totalMinutes };
    }

    throw new BadRequestException(`Unsupported time format: "${input}"`);
  }

  private normalizeDays(raw: unknown): string[] {
    if (raw == null) return [];
    let arr: any = raw;

    if (typeof raw === 'string') {
      try {
        arr = JSON.parse(raw);
      } catch {
        throw new BadRequestException(
          `Working days must be a JSON array, got: "${raw}"`,
        );
      }
    }
    if (!Array.isArray(arr)) {
      throw new BadRequestException(`Working days must be an array`);
    }
    const out = arr.map((d) => String(d).toLowerCase().trim());
    for (const d of out) {
      if (!this.VALID_DAYS.has(d)) {
        throw new BadRequestException(
          `Invalid day "${d}". Use: ${[...this.VALID_DAYS].join(', ')}`,
        );
      }
    }
    return out;
  }

  // 24h ring validator: allows overnights by design (e.g., 22:00→06:00)
  private validateTimes(
    start: ParsedTime | undefined,
    end: ParsedTime | undefined,
  ) {
    if (!start || !end) {
      throw new BadRequestException(`startTime and endTime are required`);
    }
    const duration = (end.minutes - start.minutes + 24 * 60) % (24 * 60);
    if (duration === 0) {
      throw new BadRequestException(
        `startTime and endTime cannot be identical`,
      );
    }
  }

  private async ensureUniqueName(
    companyId: string,
    name: string,
    excludeId?: string,
  ) {
    const rows = await this.db
      .select({ id: shifts.id })
      .from(shifts)
      .where(
        and(
          eq(shifts.companyId, companyId),
          eq(shifts.name, name),
          eq(shifts.isDeleted, false),
          excludeId ? not(eq(shifts.id, excludeId)) : sql`TRUE`,
        ),
      )
      .execute();
    if (rows.length > 0) {
      throw new BadRequestException(`Shift name "${name}" already exists`);
    }
  }

  private async ensureLocationBelongs(
    companyId: string,
    locationId?: string | null,
  ) {
    if (!locationId) return;
    const [loc] = await this.db
      .select({ id: companyLocations.id })
      .from(companyLocations)
      .where(
        and(
          eq(companyLocations.id, locationId),
          eq(companyLocations.companyId, companyId),
        ),
      )
      .execute();
    if (!loc) {
      throw new BadRequestException(`Location does not belong to this company`);
    }
  }

  // ---------- bulk create ----------
  async bulkCreate(companyId: string, rows: any[]) {
    const t0 = Date.now();
    this.logger.info(
      { companyId, rows: rows?.length ?? 0 },
      'shifts.bulk:start',
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      this.logger.warn({ companyId }, 'shifts.bulk:empty-input');
      throw new BadRequestException('No rows provided');
    }

    // debug headers
    const firstKeys = Object.keys(rows[0] ?? {});
    this.logger.debug({ firstKeys }, 'shifts.bulk:first-row-keys');

    // preload locations
    const locationRows = await this.db
      .select({ id: companyLocations.id, name: companyLocations.name })
      .from(companyLocations)
      .where(eq(companyLocations.companyId, companyId))
      .execute();

    this.logger.debug(
      { count: locationRows.length, sample: locationRows.slice(0, 5) },
      'shifts.bulk:locations-loaded',
    );

    const locationMap = new Map(
      locationRows.map((l) => [l.name.toLowerCase().trim(), l.id]),
    );

    // duplicate-name checks (file + db)
    const inputNames = rows.map((r) =>
      (r['Name'] ?? r['name'] ?? '').toString().trim(),
    );
    const dupInFile = inputNames.filter(
      (n, i) => n && inputNames.indexOf(n) !== i,
    );
    if (dupInFile.length) {
      this.logger.warn(
        { dupes: [...new Set(dupInFile)] },
        'shifts.bulk:dupes-in-file',
      );
      throw new BadRequestException(
        `Duplicate shift names in file: ${[...new Set(dupInFile)].join(', ')}`,
      );
    }

    if (inputNames.length) {
      const existing = await this.db
        .select({ name: shifts.name })
        .from(shifts)
        .where(
          and(
            eq(shifts.companyId, companyId),
            eq(shifts.isDeleted, false),
            inArray(shifts.name, inputNames),
          ),
        )
        .execute();
      if (existing.length) {
        const msg = `Shift names already exist: ${existing.map((e) => e.name).join(', ')}`;
        this.logger.warn({ existing }, 'shifts.bulk:dupes-in-db');
        throw new BadRequestException(msg);
      }
    }

    const valid: Array<{
      name: string;
      startTime: string;
      endTime: string;
      workingDays: string[];
      lateToleranceMinutes: number;
      allowEarlyClockIn: boolean;
      earlyClockInMinutes: number;
      allowLateClockOut: boolean;
      lateClockOutMinutes: number;
      notes?: string;
      locationId?: string | null;
    }> = [];
    const errors: Array<{ rowName: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowName = (row['Name'] ?? row['name'] ?? '').toString().trim();

      try {
        const start = this.parseTime(row['Start Time'] ?? row['startTime']);
        const end = this.parseTime(row['End Time'] ?? row['endTime']);
        const workingDays = this.normalizeDays(
          row['Working Days'] ?? row['workingDays'],
        );

        const locationName = (row['Location Name'] ?? row['locationName'] ?? '')
          .toString()
          .trim()
          .toLowerCase();
        const locationId = locationName
          ? locationMap.get(locationName)
          : undefined;

        this.logger.debug(
          {
            i,
            rowName,
            startRaw: row['Start Time'] ?? row['startTime'],
            endRaw: row['End Time'] ?? row['endTime'],
            start: start?.hhmm,
            end: end?.hhmm,
            workingDays,
            locationName: locationName || null,
            locationId: locationId || null,
          },
          'shifts.bulk:row-parse',
        );

        if (locationName && !locationId) {
          throw new BadRequestException(
            `Unknown location "${row['Location Name']}"`,
          );
        }

        this.validateTimes(start, end);

        const dto = plainToInstance(CreateShiftDto, {
          name: rowName,
          startTime: start!.hhmm,
          endTime: end!.hhmm,
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
          locationId,
        });

        const v = await validate(dto);
        if (v.length) {
          this.logger.warn(
            { i, rowName, issues: v },
            'shifts.bulk:class-validator-failed',
          );
          throw new BadRequestException(
            `Validation failed: ${JSON.stringify(v)}`,
          );
        }

        valid.push(dto as any);
      } catch (e: any) {
        const reason = e?.message ?? 'Unknown error';
        errors.push({ rowName, error: reason });
        this.logger.error({ i, rowName, reason }, 'shifts.bulk:row-failed');
      }
    }

    this.logger.debug(
      { valid: valid.length, errors: errors.length },
      'shifts.bulk:prepared',
    );

    if (valid.length === 0) {
      this.logger.warn({ errors }, 'shifts.bulk:no-valid-rows');
      throw new BadRequestException(
        `No valid rows to insert. Errors: ${errors.map((e) => `[${e.rowName}] ${e.error}`).join('; ')}`,
      );
    }

    const inserted = await this.db.transaction(async (trx) => {
      const values = valid.map((d) => ({ companyId, ...d }));
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

    this.logger.info(
      { inserted: inserted.length, errors: errors.length, ms: Date.now() - t0 },
      'shifts.bulk:done',
    );

    // burst list cache
    await this.cache.del(this.listKey(companyId));

    return {
      insertedCount: inserted.length,
      inserted,
      errors,
    };
  }

  // ---------- create ----------
  async create(dto: CreateShiftDto, user: User, ip: string) {
    const start = this.parseTime(dto.startTime as any);
    const end = this.parseTime(dto.endTime as any);
    const days = this.normalizeDays(dto.workingDays);

    await this.ensureUniqueName(user.companyId, dto.name);
    await this.ensureLocationBelongs(user.companyId, dto.locationId);
    this.validateTimes(start, end); // overnight accepted automatically

    const [created] = await this.db
      .insert(shifts)
      .values({
        companyId: user.companyId,
        ...dto,
        startTime: start!.hhmm,
        endTime: end!.hhmm,
        workingDays: days,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'time.shift',
      entityId: created.id,
      details: 'Shift created',
      userId: user.id,
      ipAddress: ip,
      changes: { before: {}, after: created },
    });

    await this.invalidateAfterChange({
      companyId: user.companyId,
      shiftId: created.id,
    });
    return created;
  }

  // ---------- list ----------
  async findAll(companyId: string, opts?: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
    const offset = Math.max(opts?.offset ?? 0, 0);

    // cache the WHOLE list once; slice in memory so a single del() bursts all variants
    const all = await this.cache.getOrSetCache(
      this.listKey(companyId),
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
      // { ttl: 60 }
    );

    return all.slice(offset, offset + limit);
  }

  // ---------- detail ----------
  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetCache(
      this.oneKey(id),
      async () => {
        const [row] = await this.db
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
        if (!row) throw new BadRequestException(`Shift ${id} not found.`);
        return row;
      },
      // { ttl: 300 }
    );
  }

  // ---------- update ----------
  async update(id: string, dto: UpdateShiftDto, user: User, ip: string) {
    const before = await this.findOne(id, user.companyId);

    if (dto.name && dto.name !== before.name) {
      await this.ensureUniqueName(user.companyId, dto.name, id);
    }
    if (dto.locationId) {
      await this.ensureLocationBelongs(user.companyId, dto.locationId);
    }

    let start = undefined as ParsedTime | undefined;
    let end = undefined as ParsedTime | undefined;
    if (dto.startTime != null) start = this.parseTime(dto.startTime as any);
    if (dto.endTime != null) end = this.parseTime(dto.endTime as any);

    const finalStart = start?.hhmm ?? before.startTime;
    const finalEnd = end?.hhmm ?? before.endTime;

    if (start || end) {
      const s = start ?? this.parseTime(before.startTime)!;
      const e = end ?? this.parseTime(before.endTime)!;
      this.validateTimes(s, e); // overnight accepted
    }

    const finalDays = dto.workingDays
      ? this.normalizeDays(dto.workingDays)
      : before.workingDays;

    const [updated] = await this.db
      .update(shifts)
      .set({
        ...dto,
        startTime: finalStart,
        endTime: finalEnd,
        workingDays: finalDays,
      })
      .where(
        and(
          eq(shifts.id, id),
          eq(shifts.companyId, user.companyId),
          eq(shifts.isDeleted, false),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'shift',
      details: 'Shift updated',
      entityId: id,
      userId: user.id,
      ipAddress: ip,
      changes: { before, after: updated },
    });

    await this.invalidateAfterChange({
      companyId: user.companyId,
      shiftId: id,
    });
    return updated;
  }

  // ---------- remove (soft) ----------
  async remove(id: string, user: User) {
    const { companyId } = user;
    const before = await this.findOne(id, companyId);

    const [updated] = await this.db
      .update(shifts)
      .set({ isDeleted: true })
      .where(
        and(
          eq(shifts.id, id),
          eq(shifts.companyId, companyId),
          eq(shifts.isDeleted, false),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'shift',
      entityId: id,
      details: 'Shift soft-deleted',
      userId: user.id,
      changes: { before, after: updated },
    });

    await this.invalidateAfterChange({ companyId, shiftId: id });
    return { success: true };
  }
}
