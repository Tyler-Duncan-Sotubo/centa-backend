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
exports.JobRolesWriteService = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../common/cache/cache.service");
const create_job_role_dto_1 = require("./dto/create-job-role.dto");
let JobRolesWriteService = class JobRolesWriteService {
    constructor(db, companySettings, cache) {
        this.db = db;
        this.companySettings = companySettings;
        this.cache = cache;
    }
    async create(companyId, dto) {
        const title = this.asString(dto.title);
        if (!title)
            throw new common_1.BadRequestException('Title is required');
        const existing = await this.db
            .select({ id: schema_1.jobRoles.id })
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.title, title)))
            .execute();
        if (existing.length) {
            throw new common_1.BadRequestException('Job role already exists');
        }
        const [created] = await this.db
            .insert(schema_1.jobRoles)
            .values({
            title,
            level: dto.level,
            description: dto.description,
            companyId,
        })
            .returning({ id: schema_1.jobRoles.id })
            .execute();
        await this.companySettings.setOnboardingTask(companyId, 'company', 'job_roles', 'done');
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async bulkCreate(companyId, rows) {
        this.ensureRows(rows);
        const parsed = this.parseRows(rows);
        this.throwIfMissingTitles(parsed);
        this.throwIfCsvDuplicates(parsed);
        const dtos = await this.validateRows(parsed);
        await this.throwIfExistingInDb(companyId, dtos.map((d) => d.title));
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                title: d.title,
                level: d.level,
                description: d.description,
            }));
            return trx
                .insert(schema_1.jobRoles)
                .values(values)
                .returning({ id: schema_1.jobRoles.id, title: schema_1.jobRoles.title })
                .execute();
        });
        await this.companySettings.setSetting(companyId, 'onboarding_job_roles', true);
        await this.cache.bumpCompanyVersion(companyId);
        return inserted;
    }
    async update(companyId, id, dto) {
        const [existing] = await this.db
            .select({ id: schema_1.jobRoles.id })
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        if (!existing)
            throw new common_1.NotFoundException('Job role not found');
        await this.db
            .update(schema_1.jobRoles)
            .set({
            title: dto.title,
            level: dto.level,
            description: dto.description,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return { id };
    }
    async remove(companyId, id) {
        const [deleted] = await this.db
            .delete(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, id)))
            .returning({ id: schema_1.jobRoles.id })
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Job role not found');
        await this.cache.bumpCompanyVersion(companyId);
        return { id: deleted.id };
    }
    ensureRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new common_1.BadRequestException('No valid rows to import.');
        }
    }
    parseRows(rows) {
        return rows.map((row, index) => {
            const title = this.asString(this.pick(row, 'Title', 'title')) ?? '';
            const level = this.asString(this.pick(row, 'Level', 'level'));
            const description = this.asString(this.pick(row, 'Description', 'description'));
            return {
                index,
                raw: row,
                title,
                titleKey: title ? this.normalizeKey(title) : '',
                level,
                description,
            };
        });
    }
    throwIfMissingTitles(parsed) {
        const missing = parsed.filter((p) => !p.titleKey);
        if (missing.length) {
            throw new common_1.BadRequestException({
                message: 'Invalid data in bulk upload: some rows are missing Title',
                missingTitleRowIndexes: missing.map((r) => r.index),
            });
        }
    }
    throwIfCsvDuplicates(parsed) {
        const seen = new Map();
        const dupMap = new Map();
        for (const p of parsed) {
            const key = p.titleKey;
            if (!seen.has(key)) {
                seen.set(key, p.index);
            }
            else {
                const first = seen.get(key);
                const arr = dupMap.get(key) ?? [first];
                arr.push(p.index);
                dupMap.set(key, arr);
            }
        }
        if (!dupMap.size)
            return;
        const duplicates = [...dupMap.entries()].map(([key, idxs]) => {
            const displayTitle = parsed.find((p) => p.titleKey === key).title;
            return { title: displayTitle, rows: idxs };
        });
        throw new common_1.BadRequestException({
            message: 'Duplicate job roles found in the CSV.',
            duplicates,
        });
    }
    async validateRows(parsed) {
        const dtos = [];
        const issues = [];
        for (const p of parsed) {
            const dto = (0, class_transformer_1.plainToInstance)(create_job_role_dto_1.CreateJobRoleDto, {
                title: p.title,
                level: p.level,
                description: p.description,
            });
            const errors = await (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidNonWhitelisted: false,
            });
            if (errors.length) {
                issues.push({
                    rowIndex: p.index,
                    title: p.title,
                    errors: this.formatValidationErrors(errors),
                });
            }
            else {
                dtos.push(dto);
            }
        }
        if (issues.length) {
            throw new common_1.BadRequestException({
                message: 'Invalid data in bulk upload.',
                issues,
            });
        }
        return dtos;
    }
    async throwIfExistingInDb(companyId, titles) {
        const existing = await this.db
            .select({ title: schema_1.jobRoles.title })
            .from(schema_1.jobRoles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.jobRoles.title, titles)))
            .execute();
        if (existing.length) {
            throw new common_1.BadRequestException('Duplicate job roles found: ' + existing.map((r) => r.title).join(', '));
        }
    }
    pick(row, ...keys) {
        for (const k of keys) {
            const v = row?.[k];
            if (v !== undefined && v !== null)
                return v;
        }
        return undefined;
    }
    asString(v) {
        if (v === undefined || v === null)
            return undefined;
        const s = String(v).trim();
        return s.length ? s : undefined;
    }
    normalizeKey(v) {
        return v.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    formatValidationErrors(errors) {
        return errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
            children: e.children?.length ? e.children : undefined,
        }));
    }
};
exports.JobRolesWriteService = JobRolesWriteService;
exports.JobRolesWriteService = JobRolesWriteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], JobRolesWriteService);
//# sourceMappingURL=job-roles-write.service.js.map