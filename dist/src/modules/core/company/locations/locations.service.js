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
var LocationsService_1;
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
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let LocationsService = LocationsService_1 = class LocationsService {
    constructor(db, audit, companySettings, logger, cache) {
        this.db = db;
        this.audit = audit;
        this.companySettings = companySettings;
        this.logger = logger;
        this.cache = cache;
        this.table = company_location_schema_1.companyLocations;
        this.logger.setContext(LocationsService_1.name);
    }
    listKey(companyId) {
        return `loc:${companyId}:list:active`;
    }
    oneKey(id) {
        return `loc:one:${id}`;
    }
    mgrKey(locationId) {
        return `loc:${locationId}:managers`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.locationId) {
            jobs.push(this.cache.del(this.oneKey(opts.locationId)));
            jobs.push(this.cache.del(this.mgrKey(opts.locationId)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'locations:cache:burst');
    }
    async checkCompany(companyId) {
        this.logger.debug({ companyId }, 'locations:checkCompany:start');
        const company = await this.db
            .select()
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, companyId))
            .execute();
        if (company.length === 0) {
            this.logger.warn({ companyId }, 'locations:checkCompany:not-found');
            throw new common_1.BadRequestException('Company not found');
        }
        if (!company[0].isActive) {
            this.logger.warn({ companyId }, 'locations:checkCompany:inactive');
            throw new common_1.BadRequestException('Company is inactive');
        }
        this.logger.debug({ companyId }, 'locations:checkCompany:ok');
        return company[0];
    }
    async create(dto, user, ip) {
        const { companyId, id: userId } = user;
        this.logger.info({ companyId, dto }, 'locations:create:start');
        await this.checkCompany(companyId);
        const existing = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.name, dto.name), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId, name: dto.name }, 'locations:create:duplicate');
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
            changes: { ...dto, before: null, after: created },
        });
        await this.companySettings.setSetting(companyId, 'onboarding_company_locations', true);
        await this.burst({ companyId, locationId: created.id });
        this.logger.info({ id: created.id }, 'locations:create:done');
        return created;
    }
    async update(locationId, dto, user, ip) {
        this.logger.info({ locationId, userId: user.id, dto }, 'locations:update:start');
        const current = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (current.length === 0) {
            this.logger.warn({ locationId }, 'locations:update:not-found');
            throw new common_1.BadRequestException('CompanyLocation not found');
        }
        const [updated] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set(dto)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
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
        await this.companySettings.setSetting(user.companyId, 'onboarding_company_locations', true);
        await this.burst({ companyId: user.companyId, locationId });
        this.logger.info({ locationId }, 'locations:update:done');
        return updated;
    }
    async softDelete(id, user) {
        this.logger.info({ id, userId: user?.id }, 'locations:softDelete:start');
        const [loc] = await this.db
            .select({
            id: company_location_schema_1.companyLocations.id,
            companyId: company_location_schema_1.companyLocations.companyId,
            isActive: company_location_schema_1.companyLocations.isActive,
        })
            .from(company_location_schema_1.companyLocations)
            .where(user?.companyId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, user.companyId))
            : (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .execute();
        if (!loc) {
            this.logger.warn({ id }, 'locations:softDelete:not-found');
            throw new common_1.NotFoundException('Location not found');
        }
        if (!loc.isActive) {
            this.logger.warn({ id }, 'locations:softDelete:already-inactive');
            throw new common_1.BadRequestException('Location is already inactive');
        }
        const [{ empCount }] = await this.db
            .select({
            empCount: (0, drizzle_orm_1.sql) `CAST(COUNT(*) AS int)`,
        })
            .from(schema_1.employees)
            .where(user?.companyId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.locationId, id), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId))
            : (0, drizzle_orm_1.eq)(schema_1.employees.locationId, id))
            .execute();
        if (empCount > 0) {
            this.logger.warn({ id, empCount }, 'locations:softDelete:has-employees');
            throw new common_1.BadRequestException(`Cannot delete location with ${empCount} employee(s) assigned to it`);
        }
        const [deletedRecord] = await this.db
            .update(company_location_schema_1.companyLocations)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
            .returning()
            .execute();
        await this.burst({ companyId: user?.companyId, locationId: id });
        this.logger.info({ id }, 'locations:softDelete:done');
        return deletedRecord;
    }
    findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'locations:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(company_location_schema_1.companyLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.companyId, companyId), (0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.isActive, true)))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'locations:findAll:db:done');
            return rows;
        });
    }
    async findOne(id) {
        const key = this.oneKey(id);
        this.logger.debug({ id, key }, 'locations:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(company_location_schema_1.companyLocations)
                .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, id))
                .execute();
            if (rows.length === 0) {
                this.logger.warn({ id }, 'locations:findOne:not-found');
                throw new common_1.BadRequestException('CompanyLocation not found');
            }
            if (!rows[0].isActive) {
                this.logger.warn({ id }, 'locations:findOne:inactive');
                throw new common_1.BadRequestException('CompanyLocation is inactive');
            }
            return rows[0];
        });
    }
    async getLocationManagers(locationId) {
        const key = this.mgrKey(locationId);
        this.logger.debug({ locationId, key }, 'locations:getManagers:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const loc = await this.db
                .select()
                .from(company_location_schema_1.companyLocations)
                .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
                .execute();
            if (loc.length === 0)
                return [];
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
            this.logger.debug({ locationId, count: managers.length }, 'locations:getManagers:db:done');
            return managers;
        });
    }
    async addLocationManager(locationId, managerId, user) {
        this.logger.info({ locationId, managerId, userId: user?.id }, 'locations:addManager:start');
        const loc = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (loc.length === 0)
            return [];
        const mgr = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
            .execute();
        if (mgr.length === 0)
            return [];
        const newManager = await this.db
            .insert(location_managers_schema_1.locationManagers)
            .values({ locationId, managerId })
            .returning()
            .execute();
        await this.burst({ companyId: user?.companyId, locationId });
        this.logger.info({ locationId, managerId }, 'locations:addManager:done');
        return newManager;
    }
    async removeLocationManager(locationId, managerId, user) {
        this.logger.info({ locationId, managerId, userId: user?.id }, 'locations:removeManager:start');
        const loc = await this.db
            .select()
            .from(company_location_schema_1.companyLocations)
            .where((0, drizzle_orm_1.eq)(company_location_schema_1.companyLocations.id, locationId))
            .execute();
        if (loc.length === 0)
            return [];
        const mgr = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
            .execute();
        if (mgr.length === 0)
            return [];
        const removed = await this.db
            .delete(location_managers_schema_1.locationManagers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.locationId, locationId), (0, drizzle_orm_1.eq)(location_managers_schema_1.locationManagers.managerId, managerId)))
            .returning()
            .execute();
        await this.burst({ companyId: user?.companyId, locationId });
        this.logger.info({ locationId, managerId }, 'locations:removeManager:done');
        return removed;
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = LocationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map