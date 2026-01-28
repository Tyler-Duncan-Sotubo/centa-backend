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
exports.DepartmentWriteService = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const create_department_dto_1 = require("./dto/create-department.dto");
let DepartmentWriteService = class DepartmentWriteService {
    constructor(db, cache, companySettings) {
        this.db = db;
        this.cache = cache;
        this.companySettings = companySettings;
    }
    async bulkCreate(companyId, rows) {
        this.ensureRows(rows);
        const parsed = this.parseRows(rows);
        this.throwIfMissingNames(parsed);
        this.throwIfCsvDuplicates(parsed);
        const dtos = await this.validateRows(parsed);
        await this.throwIfExistingInDb(companyId, dtos.map((d) => d.name));
        const inserted = await this.insertDepartments(companyId, dtos);
        await this.postWrite(companyId);
        return inserted;
    }
    ensureRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new common_1.BadRequestException('No valid rows to import.');
        }
    }
    parseRows(rows) {
        return rows.map((row, index) => {
            const name = this.asString(this.pick(row, 'Name', 'name'));
            const description = this.asString(this.pick(row, 'Description', 'description'));
            const parentDepartmentId = this.asString(this.pick(row, 'ParentDepartmentId', 'parentDepartmentId'));
            const costCenterId = this.asString(this.pick(row, 'CostCenterId', 'costCenterId'));
            return {
                index,
                raw: row,
                name: name ?? '',
                nameKey: name ? this.normalizeName(name) : '',
                description,
                parentDepartmentId,
                costCenterId,
            };
        });
    }
    throwIfMissingNames(parsed) {
        const missing = parsed.filter((p) => !p.nameKey);
        if (missing.length) {
            throw new common_1.BadRequestException({
                message: 'Invalid data in bulk upload: some rows are missing Name',
                missingNameRowIndexes: missing.map((r) => r.index),
            });
        }
    }
    throwIfCsvDuplicates(parsed) {
        const seen = new Map();
        const dupMap = new Map();
        for (const p of parsed) {
            const key = p.nameKey;
            if (!seen.has(key)) {
                seen.set(key, p.index);
            }
            else {
                const first = seen.get(key);
                const rows = dupMap.get(key) ?? [first];
                rows.push(p.index);
                dupMap.set(key, rows);
            }
        }
        if (!dupMap.size)
            return;
        const duplicates = [...dupMap.entries()].map(([key, idxs]) => {
            const displayName = parsed.find((p) => p.nameKey === key).name;
            return { name: displayName, rows: idxs };
        });
        throw new common_1.BadRequestException({
            message: 'Duplicate department names found in the CSV.',
            duplicates,
        });
    }
    async validateRows(parsed) {
        const dtos = [];
        const issues = [];
        for (const p of parsed) {
            const dto = (0, class_transformer_1.plainToInstance)(create_department_dto_1.CreateDepartmentDto, {
                name: p.name,
                description: p.description,
                parentDepartmentId: p.parentDepartmentId,
                costCenterId: p.costCenterId,
            });
            const errors = await (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidNonWhitelisted: false,
            });
            if (errors.length) {
                issues.push({
                    rowIndex: p.index,
                    name: p.name,
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
    async throwIfExistingInDb(companyId, names) {
        const existing = await this.db
            .select({ name: schema_1.departments.name })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.departments.name, names)))
            .execute();
        if (existing.length) {
            throw new common_1.BadRequestException(`Department names already exist: ${existing.map((d) => d.name).join(', ')}`);
        }
    }
    async insertDepartments(companyId, dtos) {
        return this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                name: d.name,
                description: d.description,
                parentDepartmentId: d.parentDepartmentId,
                costCenterId: d.costCenterId,
            }));
            return trx
                .insert(schema_1.departments)
                .values(values)
                .returning({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                description: schema_1.departments.description,
            })
                .execute();
        });
    }
    async postWrite(companyId) {
        await Promise.all([
            this.companySettings.setSetting(companyId, 'onboarding_departments', true),
            this.cache.bumpCompanyVersion(companyId),
        ]);
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
    normalizeName(name) {
        return name.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    formatValidationErrors(errors) {
        return errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
            children: e.children?.length ? e.children : undefined,
        }));
    }
};
exports.DepartmentWriteService = DepartmentWriteService;
exports.DepartmentWriteService = DepartmentWriteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        company_settings_service_1.CompanySettingsService])
], DepartmentWriteService);
//# sourceMappingURL=department-write.service.js.map