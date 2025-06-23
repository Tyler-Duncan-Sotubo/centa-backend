import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

@Injectable()
export class LocationsService {
  protected table = companyLocations;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async checkCompany(companyId: string) {
    // check if the company exists
    const company = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // check if the company is active
    if (!company[0].isActive) {
      throw new BadRequestException('Company is inactive');
    }

    // check if the company is the same as the user company
    if (company[0].id !== companyId) {
      throw new BadRequestException(
        'You are not allowed to update this company',
      );
    }

    return company[0];
  }

  async create(dto: CreateLocationDto, user: User, ip: string) {
    const { companyId, id } = user;
    // check if the company exists
    await this.checkCompany(companyId);

    // check if the location already exists
    const location = await this.db
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

    if (location.length > 0) {
      throw new BadRequestException('Location already exists');
    }

    const companyLocation = this.db
      .insert(companyLocations)
      .values({
        ...dto,
        companyId,
      })
      .returning();

    await this.audit.logAction({
      entity: 'CompanyLocation',
      action: 'Create',
      userId: id,
      ipAddress: ip,
      details: 'New location created',
      changes: {
        ...dto,
        before: null,
        after: companyLocation[0],
      },
    });

    // make onboarding step complete
    await this.companySettings.setSetting(
      companyId,
      'onboarding_company_locations',
      true,
    );

    return companyLocation;
  }

  findAll(companyId: string) {
    return this.db
      .select()
      .from(companyLocations)
      .where(
        and(
          eq(companyLocations.companyId, companyId),
          eq(companyLocations.isActive, true),
        ),
      )
      .execute();
  }

  async findOne(id: string) {
    // check if the companyLocation exists
    const companyLocation = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, id))
      .execute();

    if (!companyLocation) {
      throw new BadRequestException('CompanyLocation not found');
    }

    // check if the companyLocation is active
    if (!companyLocation[0].isActive) {
      throw new BadRequestException('CompanyLocation is inactive');
    }

    return companyLocation[0];
  }

  async update(
    locationId: string,
    dto: UpdateLocationDto,
    user: User,
    ip: string,
  ) {
    const { id } = user;
    // check if the companyLocation exists
    const companyLocation = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();
    if (!companyLocation) {
      throw new BadRequestException('CompanyLocation not found');
    }

    const [updatedLocation] = await this.db
      .update(companyLocations)
      .set(dto)
      .where(eq(companyLocations.id, locationId))
      .returning()
      .execute();

    await this.audit.logAction({
      entity: 'CompanyLocation',
      action: 'Update',
      details: 'Location updated',
      userId: id,
      ipAddress: ip,
      changes: {
        ...dto,
        before: companyLocation[0],
        after: updatedLocation,
      },
    });

    // make onboarding step complete
    await this.companySettings.setSetting(
      user.companyId,
      'onboarding_company_locations',
      true,
    );

    return updatedLocation;
    // check if the companyLocation is active
  }

  async softDelete(id: string) {
    // check if employees exist in the location
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

    const [deletedRecord] = await this.db
      .update(companyLocations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(companyLocations.id, id))
      .returning();

    return deletedRecord;
  }

  // Location Managers
  async getLocationManagers(locationId: string) {
    // check if the location exists
    const location = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (!location) {
      return {};
    }

    // get Location Managers
    const Managers = await this.db
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

    if (!locationManagers) {
      return {};
    }

    return Managers;
  }

  async addLocationManager(locationId: string, managerId: string) {
    // check if the location exists
    const location = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (!location) {
      return {};
    }

    // check if the manager exists
    const manager = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, managerId))
      .execute();

    if (!manager) {
      return {};
    }

    // add Location Manager
    const newManager = await this.db
      .insert(locationManagers)
      .values({
        locationId,
        managerId,
      })
      .returning()
      .execute();

    return newManager;
  }

  async removeLocationManager(locationId: string, managerId: string) {
    // check if the location exists
    const location = await this.db
      .select()
      .from(companyLocations)
      .where(eq(companyLocations.id, locationId))
      .execute();

    if (!location) {
      return {};
    }

    // check if the manager exists
    const manager = await this.db
      .select()
      .from(employees)
      .where(eq(employees.id, managerId))
      .execute();

    if (!manager) {
      return {};
    }

    // remove Location Manager
    const removedManager = await this.db
      .delete(locationManagers)
      .where(
        and(
          eq(locationManagers.locationId, locationId),
          eq(locationManagers.managerId, managerId),
        ),
      )
      .returning()
      .execute();

    return removedManager;
  }
}
