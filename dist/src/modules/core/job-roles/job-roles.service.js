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
var JobRolesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRolesService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const create_job_role_dto_1 = require("./dto/create-job-role.dto");
const base_crud_service_1 = require("../../../common/services/base-crud.service");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let JobRolesService = JobRolesService_1 = class JobRolesService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, companySettings, cache, logger) {
        super(db, audit);
        this.companySettings = companySettings;
        this.cache = cache;
        this.logger = logger;
        this.table = schema_1.jobRoles;
        this.logger.setContext(JobRolesService_1.name);
    }
    keys(companyId) {
        return {
            list: `jobroles:list:${companyId}`,
            one: (id) => `jobroles:one:${companyId}:${id}`,
        };
    }
    async invalidate(companyId, id) {
        const k = this.keys(companyId);
        const keys = [k.list, id ? k.one(id) : undefined].filter(Boolean);
        this.logger.debug({ companyId, keys, id }, 'jobroles:cache:invalidate:start');
        await Promise.all(keys.map((key) => this.cache.del?.(key)));
        this.logger.debug({ companyId, id }, 'jobroles:cache:invalidate:done');
    }
    async create(companyId, dto) {
        this.logger.info({ companyId, dto }, 'jobroles:create:start');
        const existingJobRole = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.title, dto.title)))
            .execute();
        if (existingJobRole.length) {
            this.logger.warn({ companyId, title: dto.title }, 'jobroles:create:duplicate');
            throw new common_1.BadRequestException('Job role already exists');
        }
        const [created] = await this.db
            .insert(schema_1.jobRoles)
            .values({
            title: dto.title,
            level: dto.level,
            description: dto.description,
            companyId,
        })
            .returning({ id: schema_1.jobRoles.id })
            .execute();
        await this.companySettings.setSetting(companyId, 'onboarding_job_roles', true);
        await this.invalidate(companyId);
        this.logger.info({ companyId, jobRoleId: created.id }, 'jobroles:create:done');
        return created;
    }
    async bulkCreate(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'jobroles:bulkCreate:start');
        const existingJobRoles = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId))
            .execute();
        const existingTitles = new Set(existingJobRoles.map((role) => role.title));
        const duplicateTitles = rows
            .map((row) => row['Title'] ?? row['title'])
            .filter((title) => existingTitles.has(title));
        if (duplicateTitles.length) {
            this.logger.warn({ companyId, duplicateTitles }, 'jobroles:bulkCreate:duplicates');
            throw new common_1.BadRequestException('Duplicate job roles found: ' + duplicateTitles.join(', '));
        }
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_job_role_dto_1.CreateJobRoleDto, {
                title: row['Title'] ?? row['title'],
                level: row['Level'] ?? row['level'],
                description: row['Description'] ?? row['description'],
            });
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length) {
                this.logger.warn({ companyId, errors }, 'jobroles:bulkCreate:validation-error');
                throw new common_1.BadRequestException('Invalid data in bulk upload: ' + JSON.stringify(errors));
            }
            dtos.push(dto);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                title: d.title,
                level: d.level,
                description: d.description,
            }));
            const result = await trx
                .insert(schema_1.jobRoles)
                .values(values)
                .returning({ id: schema_1.jobRoles.id, title: schema_1.jobRoles.title })
                .execute();
            return result;
        });
        await this.companySettings.setSetting(companyId, 'onboarding_job_roles', true);
        await this.invalidate(companyId);
        this.logger.info({ companyId, created: inserted.length }, 'jobroles:bulkCreate:done');
        return inserted;
    }
    async update(companyId, id, dto, userId, ip) {
        this.logger.info({ companyId, jobRoleId: id, dto, userId, ip }, 'jobroles:update:start');
        const res = await this.updateWithAudit(companyId, id, { title: dto.title, level: dto.level, description: dto.description }, {
            entity: 'JobRole',
            action: 'UpdateJobRole',
            fields: ['title', 'level', 'description'],
        }, userId, ip);
        await this.invalidate(companyId, id);
        this.logger.info({ companyId, jobRoleId: id }, 'jobroles:update:done');
        return res;
    }
    async remove(companyId, id) {
        this.logger.info({ companyId, jobRoleId: id }, 'jobroles:remove:start');
        const jobRole = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        if (!jobRole.length) {
            this.logger.warn({ companyId, jobRoleId: id }, 'jobroles:remove:not-found');
            throw new common_1.NotFoundException('Job role not found');
        }
        const [{ count }] = await this.db
            .select({
            count: (0, drizzle_orm_1.sql) `CAST(COUNT(*) AS int)`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, id)))
            .execute();
        if (count > 0) {
            this.logger.warn({ companyId, jobRoleId: id, employeeCount: count }, 'jobroles:remove:blocked:employees-assigned');
            throw new common_1.BadRequestException(`Cannot delete job role: ${count} employee(s) are assigned to it.`);
        }
        const res = await this.db
            .delete(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        await this.invalidate(companyId, id);
        this.logger.info({ companyId, jobRoleId: id }, 'jobroles:remove:done');
        return res;
    }
    async findAll(companyId) {
        const cacheKey = this.keys(companyId).list;
        this.logger.debug({ companyId, cacheKey }, 'jobroles:findAll:start');
        const rows = await this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select()
                .from(schema_1.jobRoles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId)))
                .orderBy(schema_1.jobRoles.title)
                .execute();
        });
        this.logger.debug({ companyId, count: rows.length }, 'jobroles:findAll:done');
        return rows;
    }
    async findOne(companyId, id) {
        const cacheKey = this.keys(companyId).one(id);
        this.logger.debug({ companyId, jobRoleId: id, cacheKey }, 'jobroles:findOne:start');
        const row = await this.cache.getOrSetCache(cacheKey, async () => {
            const rows = await this.db
                .select()
                .from(schema_1.jobRoles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
                .execute();
            if (!rows.length) {
                this.logger.warn({ companyId, jobRoleId: id }, 'jobroles:findOne:not-found');
                throw new common_1.NotFoundException('Job role not found');
            }
            return rows[0];
        });
        this.logger.debug({ companyId, jobRoleId: id }, 'jobroles:findOne:done');
        return row;
    }
};
exports.JobRolesService = JobRolesService;
exports.JobRolesService = JobRolesService = JobRolesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], JobRolesService);
//# sourceMappingURL=job-roles.service.js.map