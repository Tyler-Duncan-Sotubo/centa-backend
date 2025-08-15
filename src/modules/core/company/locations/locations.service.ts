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
import { eq, and } from 'drizzle-orm';
import { companyLocations } from '../schema/company-location.schema';
import { companies } from '../schema/company.schema';
import { User } from 'src/common/types/user.type';
import { locationManagers } from '../schema/location-managers.schema';
import { employees } from '../../schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service'; // adjust if your path differs

@Injectable()
export class LocationsService {
  protected table = companyLocations;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly companySettings: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}
  private tags(companyId: string) {
    return [`company:${companyId}:locations`];
  }

  async checkCompany(companyId: string) {
    const rows = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (rows.length === 0) throw new BadRequestException('Company not found');
    const company = rows[0];

    if (!company.isActive) throw new BadRequestException('Company is inactive');

    return company;
  }

  async create(dto: CreateLocationDto, user: User, ip: string) {
    const { companyId, id: userId } = user;

    await this.checkCompany(companyId);

    const exists = await this.db
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

    if (exists.length > 0) {
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
      changes: { before: null, after: created },
    });

    // mark onboarding step complete (CompanySettingsService will bump version for settings)
    await this.companySettings.setSetting(
      companyId,
      'onboarding_company_locations',
      true,
    );

    // bump for locations-related caches
    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['locations', 'all'],
      () =>
        this.db
          .select()
          .from(companyLocations)
          .where(
            and(
              eq(companyLocations.companyId, companyId),
              eq(companyLocations.isActive, true),
            ),
          )
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string) {
    // get the record (also gives us companyId for versioned cache)
    const [row] = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, id))
      .execute();

    if (!row) throw new BadRequestException('CompanyLocation not found');
    if (!row.isActive)
      throw new BadRequestException('CompanyLocation is inactive');

    // wrap in cache so repeated hits are cheap
    return this.cache.getOrSetVersioned(
      row.companyId,
      ['locations', 'one', id],
      async () => row, // we already have it
      { tags: this.tags(row.companyId) },
    );
  }

  async update(
    locationId: string,
    dto: UpdateLocationDto,
    user: User,
    ip: string,
  ) {
    const { id: userId } = user;

    const currentRows = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (currentRows.length === 0) {
      throw new BadRequestException('CompanyLocation not found');
    }
    const before = currentRows[0];

    const [updated] = await this.db
      .update(companyLocations)
      .set({ ...dto })
      .where(eq(companyLocations.id, locationId))
      .returning()
      .execute();

    await this.audit.logAction({
      entity: 'CompanyLocation',
      action: 'Update',
      details: 'Location updated',
      userId,
      ipAddress: ip,
      changes: { before, after: updated },
    });

    // mark onboarding step complete
    await this.companySettings.setSetting(
      user.companyId,
      'onboarding_company_locations',
      true,
    );

    // bump locations caches
    await this.cache.bumpCompanyVersion(before.companyId);

    return updated;
  }

  async softDelete(id: string) {
    // verify no employees assigned
    const employeesInLocation = await this.db
      .select()
      .from(employees)
      .where(eq(employees.locationId, id))
      .execute();

    if (employeesInLocation.length > 0) {
      throw new BadRequestException(
        'Cannot delete location with employees assigned to it',
      );
    }

    // fetch to get companyId for cache bump
    const [existing] = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, id))
      .execute();

    if (!existing) {
      throw new NotFoundException('CompanyLocation not found');
    }

    const [deletedRecord] = await this.db
      .update(companyLocations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companyLocations.id, id))
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(existing.companyId);

    return deletedRecord;
  }

  // -------- Location Managers --------

  async getLocationManagers(locationId: string) {
    // ensure location exists (also to fetch companyId for caching)
    const [loc] = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (!loc) return [];

    return this.cache.getOrSetVersioned(
      loc.companyId,
      ['locations', 'managers', locationId],
      async () => {
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

        return managers; // [] if none
      },
      { tags: this.tags(loc.companyId) },
    );
  }

  async addLocationManager(locationId: string, managerId: string) {
    const [loc] = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();
    if (!loc) return [];

    const [mgr] = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, managerId))
      .execute();
    if (!mgr) return [];

    const inserted = await this.db
      .insert(locationManagers)
      .values({ locationId, managerId })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(loc.companyId);

    return inserted;
  }

  async removeLocationManager(locationId: string, managerId: string) {
    const [loc] = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();
    if (!loc) return [];

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

    await this.cache.bumpCompanyVersion(loc.companyId);

    return removed;
  }
}
