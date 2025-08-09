import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { eq, and, sql } from 'drizzle-orm';
import { companyLocations } from '../schema/company-location.schema';
import { companies } from '../schema/company.schema';
import { User } from 'src/common/types/user.type';
import { locationManagers } from '../schema/location-managers.schema';
import { employees } from '../../schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LocationsService {
  protected table = companyLocations;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly companySettings: CompanySettingsService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(LocationsService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `loc:${companyId}:list:active`;
  }
  private oneKey(id: string) {
    return `loc:one:${id}`;
  }
  private mgrKey(locationId: string) {
    return `loc:${locationId}:managers`;
  }

  private async burst(opts: { companyId?: string; locationId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.locationId) {
      jobs.push(this.cache.del(this.oneKey(opts.locationId)));
      jobs.push(this.cache.del(this.mgrKey(opts.locationId)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'locations:cache:burst');
  }

  // ---------- helpers ----------
  async checkCompany(companyId: string) {
    this.logger.debug({ companyId }, 'locations:checkCompany:start');

    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (company.length === 0) {
      this.logger.warn({ companyId }, 'locations:checkCompany:not-found');
      throw new BadRequestException('Company not found');
    }

    if (!company[0].isActive) {
      this.logger.warn({ companyId }, 'locations:checkCompany:inactive');
      throw new BadRequestException('Company is inactive');
    }

    // (Redundant self-check removed: `company[0].id !== companyId` can’t happen given the where clause)

    this.logger.debug({ companyId }, 'locations:checkCompany:ok');
    return company[0];
  }

  // ---------- mutations ----------
  async create(dto: CreateLocationDto, user: User, ip: string) {
    const { companyId, id: userId } = user;
    this.logger.info({ companyId, dto }, 'locations:create:start');

    await this.checkCompany(companyId);

    const existing = await this.db
      .select()
      .from(companyLocations)
      .where(
        and(
          eq(companyLocations.companyId, companyId),
          eq(companyLocations.name, dto.name),
          eq(companyLocations.isActive, true),
        ),
      )
      .execute();

    if (existing.length > 0) {
      this.logger.warn(
        { companyId, name: dto.name },
        'locations:create:duplicate',
      );
      throw new BadRequestException('Location already exists');
    }

    const [created] = await this.db
      .insert(companyLocations)
      .values({ ...dto, companyId })
      .returning()
      .execute();

    await this.audit.logAction({
      entity: 'CompanyLocation',
      action: 'Create',
      userId,
      ipAddress: ip,
      details: 'New location created',
      changes: { ...dto, before: null, after: created },
    });

    await this.companySettings.setSetting(
      companyId,
      'onboarding_company_locations',
      true,
    );

    await this.burst({ companyId, locationId: created.id });
    this.logger.info({ id: created.id }, 'locations:create:done');
    return created;
  }

  async update(
    locationId: string,
    dto: UpdateLocationDto,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { locationId, userId: user.id, dto },
      'locations:update:start',
    );

    const current = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (current.length === 0) {
      this.logger.warn({ locationId }, 'locations:update:not-found');
      throw new BadRequestException('CompanyLocation not found');
    }

    const [updated] = await this.db
      .update(companyLocations)
      .set(dto)
      .where(eq(companyLocations.id, locationId))
      .returning()
      .execute();

    await this.audit.logAction({
      entity: 'CompanyLocation',
      action: 'Update',
      details: 'Location updated',
      userId: user.id,
      ipAddress: ip,
      changes: { ...dto, before: current[0], after: updated },
    });

    await this.companySettings.setSetting(
      user.companyId,
      'onboarding_company_locations',
      true,
    );

    await this.burst({ companyId: user.companyId, locationId });
    this.logger.info({ locationId }, 'locations:update:done');
    return updated;
  }

  async softDelete(id: string, user?: User) {
    this.logger.info({ id, userId: user?.id }, 'locations:softDelete:start');

    // 1) Ensure the location exists (and belongs to this company, if provided)
    const [loc] = await this.db
      .select({
        id: companyLocations.id,
        companyId: companyLocations.companyId,
        isActive: companyLocations.isActive,
      })
      .from(companyLocations)
      .where(
        user?.companyId
          ? and(
              eq(companyLocations.id, id),
              eq(companyLocations.companyId, user.companyId),
            )
          : eq(companyLocations.id, id),
      )
      .execute();

    if (!loc) {
      this.logger.warn({ id }, 'locations:softDelete:not-found');
      throw new NotFoundException('Location not found');
    }
    if (!loc.isActive) {
      this.logger.warn({ id }, 'locations:softDelete:already-inactive');
      throw new BadRequestException('Location is already inactive');
    }

    // 2) Block deletion if any employees are assigned to this location
    const [{ empCount }] = await this.db
      .select({
        empCount: sql<number>`CAST(COUNT(*) AS int)`,
      })
      .from(employees)
      .where(
        user?.companyId
          ? and(
              eq(employees.locationId, id),
              eq(employees.companyId, user.companyId),
            )
          : eq(employees.locationId, id),
      )
      .execute();

    if (empCount > 0) {
      this.logger.warn({ id, empCount }, 'locations:softDelete:has-employees');
      throw new BadRequestException(
        `Cannot delete location with ${empCount} employee(s) assigned to it`,
      );
    }

    // 3) Soft-delete
    const [deletedRecord] = await this.db
      .update(companyLocations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companyLocations.id, id))
      .returning()
      .execute();

    // 4) Invalidate/notify downstream
    await this.burst({ companyId: user?.companyId, locationId: id });

    this.logger.info({ id }, 'locations:softDelete:done');
    return deletedRecord;
  }

  // ---------- queries ----------
  findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'locations:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(companyLocations)
        .where(
          and(
            eq(companyLocations.companyId, companyId),
            eq(companyLocations.isActive, true),
          ),
        )
        .execute();

      this.logger.debug(
        { companyId, count: rows.length },
        'locations:findAll:db:done',
      );
      return rows;
    });
  }

  async findOne(id: string) {
    const key = this.oneKey(id);
    this.logger.debug({ id, key }, 'locations:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(companyLocations)
        .where(eq(companyLocations.id, id))
        .execute();

      if (rows.length === 0) {
        this.logger.warn({ id }, 'locations:findOne:not-found');
        throw new BadRequestException('CompanyLocation not found');
      }

      if (!rows[0].isActive) {
        this.logger.warn({ id }, 'locations:findOne:inactive');
        throw new BadRequestException('CompanyLocation is inactive');
      }

      return rows[0];
    });
  }

  // ---------- location managers ----------
  async getLocationManagers(locationId: string) {
    const key = this.mgrKey(locationId);
    this.logger.debug({ locationId, key }, 'locations:getManagers:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const loc = await this.db
        .select()
        .from(companyLocations)
        .where(eq(companyLocations.id, locationId))
        .execute();

      if (loc.length === 0) return [];

      const managers = await this.db
        .select({
          locationId: companyLocations.id,
          managerId: locationManagers.managerId,
          name: employees.firstName,
          email: employees.email,
        })
        .from(locationManagers)
        .innerJoin(
          companyLocations,
          eq(locationManagers.locationId, companyLocations.id),
        )
        .leftJoin(employees, eq(locationManagers.managerId, employees.id))
        .where(eq(locationManagers.locationId, locationId))
        .execute();

      this.logger.debug(
        { locationId, count: managers.length },
        'locations:getManagers:db:done',
      );
      return managers;
    });
  }

  async addLocationManager(locationId: string, managerId: string, user?: User) {
    this.logger.info(
      { locationId, managerId, userId: user?.id },
      'locations:addManager:start',
    );

    const loc = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();
    if (loc.length === 0) return [];

    const mgr = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, managerId))
      .execute();
    if (mgr.length === 0) return [];

    const newManager = await this.db
      .insert(locationManagers)
      .values({ locationId, managerId })
      .returning()
      .execute();

    await this.burst({ companyId: user?.companyId, locationId });
    this.logger.info({ locationId, managerId }, 'locations:addManager:done');
    return newManager;
  }

  async removeLocationManager(
    locationId: string,
    managerId: string,
    user?: User,
  ) {
    this.logger.info(
      { locationId, managerId, userId: user?.id },
      'locations:removeManager:start',
    );

    const loc = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();
    if (loc.length === 0) return [];

    const mgr = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, managerId))
      .execute();
    if (mgr.length === 0) return [];

    const removed = await this.db
      .delete(locationManagers)
      .where(
        and(
          eq(locationManagers.locationId, locationId),
          eq(locationManagers.managerId, managerId),
        ),
      )
      .returning()
      .execute();

    await this.burst({ companyId: user?.companyId, locationId });
    this.logger.info({ locationId, managerId }, 'locations:removeManager:done');
    return removed;
  }
}
