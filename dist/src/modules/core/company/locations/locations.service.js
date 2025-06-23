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
let LocationsService = class LocationsService {
    constructor(db, audit, companySettings) {
        this.db = db;
        this.audit = audit;
        this.companySettings = companySettings;
        this.table = company_location_schema_1.companyLocations;
    }
    async checkCompany(companyId) {
        const company = await this.db
            .select()
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, companyId))
            .execute();
        if (!company) {
            throw new common_1.BadRequestException('Company not found');
        }
        if (!company[0].isActive) {
            throw new common_1.BadRequestException('Company is inactive');
        }
        if (company[0].id !== companyId) {
            throw new common_1.BadRequestException('You are not allowed to update this company');
        }
        return company[0];
    }
    async create(dto, user, ip) {
        const { companyId, id } = user;
        await this.checkCompany(companyId);
        const location = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.name, dto.name), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute();
        if (location.length > 0) {
            throw new common_1.BadRequestException('Location already exists');
        }
        const companyLocation = this.db
            .insert(company_location_schema_1.companyLocations)
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
        await this.companySettings.setSetting(companyId, 'onboarding_company_locations', true);
        return companyLocation;
    }
    findAll(companyId) {
        return this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute();
    }
    async findOne(id) {
        const companyLocation = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .execute();
        if (!companyLocation) {
            throw new common_1.BadRequestException('CompanyLocation not found');
        }
        if (!companyLocation[0].isActive) {
            throw new common_1.BadRequestException('CompanyLocation is inactive');
        }
        return companyLocation[0];
    }
    async update(locationId, dto, user, ip) {
        const { id } = user;
        const companyLocation = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!companyLocation) {
            throw new common_1.BadRequestException('CompanyLocation not found');
        }
        const [updatedLocation] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set(dto)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
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
        await this.companySettings.setSetting(user.companyId, 'onboarding_company_locations', true);
        return updatedLocation;
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
        const [deletedRecord] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .returning();
        return deletedRecord;
    }
    async getLocationManagers(locationId) {
        const location = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!location) {
            return {};
        }
        const Managers = await this.db
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
        if (!location_managers_schema_1.locationManagers) {
            return {};
        }
        return Managers;
    }
    async addLocationManager(locationId, managerId) {
        const location = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!location) {
            return {};
        }
        const manager = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
            .execute();
        if (!manager) {
            return {};
        }
        const newManager = await this.db
            .insert(location_managers_schema_1.locationManagers)
            .values({
            locationId,
            managerId,
        })
            .returning()
            .execute();
        return newManager;
    }
    async removeLocationManager(locationId, managerId) {
        const location = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (!location) {
            return {};
        }
        const manager = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
            .execute();
        if (!manager) {
            return {};
        }
        const removedManager = await this.db
            .delete(location_managers_schema_1.locationManagers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.locationId, locationId), (0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.managerId, managerId)))
            .returning()
            .execute();
        return removedManager;
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map