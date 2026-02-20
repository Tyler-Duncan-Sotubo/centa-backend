"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const company_location_schema_1 = require("../schema/company-location.schema");
const company_schema_1 = require("../schema/company.schema");
const location_managers_schema_1 = require("../schema/location-managers.schema");
const schema_1 = require("../../schema");
const company_settings_service_1 = require("../../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../../common/cache/cache.service");
const employee_allowed_locations_schema_1 = require("../schema/employee-allowed-locations.schema");
let LocationsService = class LocationsService {
    constructor(db, audit, companySettings, cache) {
        this.db = db;
        this.audit = audit;
        this.companySettings = companySettings;
        this.cache = cache;
        this.table = company_location_schema_1.companyLocations;
    }
    tags(companyId) {
        return [`company:${companyId}:locations`];
    }
    async checkCompany(companyId) {
        const rows = await this.db
            .select()
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, companyId))
            .execute();
        if (rows.length === 0)
            throw new common_1.BadRequestException('Company not found');
        const company = rows[0];
        if (!company.isActive)
            throw new common_1.BadRequestException('Company is inactive');
        return company;
    }
    async create(dto, user, ip) {
        const { companyId, id: userId } = user;
        await this.checkCompany(companyId);
        const exists = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.name, dto.name), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute();
        if (exists.length > 0) {
            throw new common_1.BadRequestException('Location already exists');
        }
        const [created] = await this.db
            .insert(company_location_schema_1.companyLocations)
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
        await this.companySettings.setOnboardingTask(user.companyId, 'company', 'company_locations', 'done');
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['locations', 'all'], () => this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute(), { tags: this.tags(companyId) });
    }
    async findOne(id) {
        const [row] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .execute();
        if (!row)
            throw new common_1.BadRequestException('CompanyLocation not found');
        if (!row.isActive)
            throw new common_1.BadRequestException('CompanyLocation is inactive');
        return this.cache.getOrSetVersioned(row.companyId, ['locations', 'one', id], async () => row, { tags: this.tags(row.companyId) });
    }
    async update(locationId, dto, user, ip) {
        const { id: userId } = user;
        const currentRows = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (currentRows.length === 0) {
            throw new common_1.BadRequestException('CompanyLocation not found');
        }
        const before = currentRows[0];
        const [updated] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set({ ...dto })
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
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
        await this.companySettings.setSetting(user.companyId, 'onboarding_company_locations', true);
        await this.cache.bumpCompanyVersion(before.companyId);
        return updated;
    }
    async softDelete(id) {
        const employeesInLocation = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.locationId, id))
            .execute();
        if (employeesInLocation.length > 0) {
            throw new common_1.BadRequestException('Cannot delete location with employees assigned to it');
        }
        const [existing] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .execute();
        if (!existing) {
            throw new common_1.NotFoundException('CompanyLocation not found');
        }
        const [deletedRecord] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(existing.companyId);
        return deletedRecord;
    }
    async getLocationManagers(locationId) {
        const [loc] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!loc)
            return [];
        return this.cache.getOrSetVersioned(loc.companyId, ['locations', 'managers', locationId], async () => {
            const managers = await this.db
                .select({
                locationId: company_location_schema_1.companyLocations.id,
                managerId: location_managers_schema_1.locationManagers.managerId,
                name: schema_1.employees.firstName,
                email: schema_1.employees.email,
            })
                .from(location_managers_schema_1.locationManagers)
                .innerJoin(company_location_schema_1.companyLocations, (0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.locationId, company_location_schema_1.companyLocations.id))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.managerId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.locationId, locationId))
                .execute();
            return managers;
        }, { tags: this.tags(loc.companyId) });
    }
    async addLocationManager(locationId, managerId) {
        const [loc] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!loc)
            return [];
        const [mgr] = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
            .execute();
        if (!mgr)
            return [];
        const inserted = await this.db
            .insert(location_managers_schema_1.locationManagers)
            .values({ locationId, managerId })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(loc.companyId);
        return inserted;
    }
    async removeLocationManager(locationId, managerId) {
        const [loc] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!loc)
            return [];
        const removed = await this.db
            .delete(location_managers_schema_1.locationManagers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.locationId, locationId), (0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.managerId, managerId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(loc.companyId);
        return removed;
    }
    async addAllowedWorkLocationForEmployee(employeeId, locationId, user, ip) {
        const { companyId, id: userId } = user;
        await this.checkCompany(companyId);
        const [emp] = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .execute();
        if (!emp)
            throw new common_1.BadRequestException('Employee not found');
        const [loc] = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute();
        if (!loc)
            throw new common_1.BadRequestException('Location not found or inactive');
        const existing = await this.db
            .select()
            .from(employee_allowed_locations_schema_1.employeeAllowedLocations)
            .where((0, drizzle_orm_1.eq)(employee_allowed_locations_schema_1.employeeAllowedLocations.employeeId, employeeId))
            .execute();
        if (existing.length >= 2) {
            throw new common_1.BadRequestException('Maximum of 2 additional work locations allowed');
        }
        if (emp.locationId === locationId) {
            throw new common_1.BadRequestException('Location is already the employee primary location');
        }
        const [inserted] = await this.db
            .insert(employee_allowed_locations_schema_1.employeeAllowedLocations)
            .values({ employeeId, locationId })
            .returning()
            .execute();
        await this.audit.logAction({
            entity: 'EmployeeAllowedLocation',
            action: 'Create',
            userId,
            ipAddress: ip,
            details: 'Added allowed work location for employee',
            changes: { before: null, after: inserted },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map