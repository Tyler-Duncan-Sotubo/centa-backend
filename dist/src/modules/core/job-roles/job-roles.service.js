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
const base_crud_service_1 = require("../../../common/services/base-crud.service");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../common/cache/cache.service");
const job_roles_write_service_1 = require("./job-roles-write.service");
let JobRolesService = class JobRolesService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, cache, write) {
        super(db, audit);
        this.cache = cache;
        this.write = write;
        this.table = schema_1.jobRoles;
    }
    tags(companyId) {
        return [`company:${companyId}:job-roles`];
    }
    create(companyId, dto) {
        return this.write.create(companyId, dto);
    }
    bulkCreate(companyId, rows) {
        return this.write.bulkCreate(companyId, rows);
    }
    async findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['job-roles', 'all'], () => this.db
            .select()
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId))
            .orderBy(schema_1.jobRoles.title)
            .execute(), { tags: this.tags(companyId) });
    }
    async findOne(companyId, id) {
        return this.cache.getOrSetVersioned(companyId, ['job-roles', 'one', id], async () => {
            const rows = await this.db
                .select()
                .from(schema_1.jobRoles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
                .execute();
            if (!rows.length)
                throw new common_1.NotFoundException('Job role not found');
            return rows[0];
        }, { tags: this.tags(companyId) });
    }
    async update(companyId, id, dto, userId, ip) {
        const result = await this.updateWithAudit(companyId, id, { title: dto.title, level: dto.level, description: dto.description }, {
            entity: 'JobRole',
            action: 'UpdateJobRole',
            fields: ['title', 'level', 'description'],
        }, userId, ip);
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    remove(companyId, id) {
        return this.write.remove(companyId, id);
    }
};
exports.JobRolesService = JobRolesService;
exports.JobRolesService = JobRolesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        job_roles_write_service_1.JobRolesWriteService])
], JobRolesService);
//# sourceMappingURL=job-roles.service.js.map