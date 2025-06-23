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
exports.JobRolesService = void 0;
const common_1 = require("@nestjs/common");
const create_job_role_dto_1 = require("./dto/create-job-role.dto");
const base_crud_service_1 = require("../../../common/services/base-crud.service");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let JobRolesService = class JobRolesService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, companySettings) {
        super(db, audit);
        this.companySettings = companySettings;
        this.table = schema_1.jobRoles;
    }
    async create(companyId, dto) {
        const existingJobRole = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.title, dto.title)))
            .execute();
        if (existingJobRole.length) {
            throw new common_1.NotFoundException('Job role already exists');
        }
        await this.companySettings.setSetting(companyId, 'onboarding_job_roles', true);
        return this.db
            .insert(schema_1.jobRoles)
            .values({
            title: dto.title,
            level: dto.level,
            description: dto.description,
            companyId,
        })
            .returning({ id: schema_1.jobRoles.id })
            .execute();
    }
    async bulkCreate(companyId, rows) {
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
        return inserted;
    }
    async findAll(companyId) {
        return this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId)))
            .orderBy(schema_1.jobRoles.title)
            .execute();
    }
    async findOne(companyId, id) {
        const jobRole = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        if (!jobRole.length) {
            throw new common_1.NotFoundException('Job role not found');
        }
        return jobRole[0];
    }
    async update(companyId, id, dto, userId, ip) {
        return this.updateWithAudit(companyId, id, { title: dto.title, level: dto.level, description: dto.description }, {
            entity: 'JobRole',
            action: 'UpdateJobRole',
            fields: ['title', 'level', 'description'],
        }, userId, ip);
    }
    async remove(companyId, id) {
        const jobRole = await this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        if (!jobRole.length) {
            throw new common_1.NotFoundException('Job role not found');
        }
        return this.db
            .delete(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
    }
};
exports.JobRolesService = JobRolesService;
exports.JobRolesService = JobRolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], JobRolesService);
//# sourceMappingURL=job-roles.service.js.map