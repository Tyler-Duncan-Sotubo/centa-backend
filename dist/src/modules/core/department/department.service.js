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
exports.DepartmentService = void 0;
const common_1 = require("@nestjs/common");
const create_department_dto_1 = require("./dto/create-department.dto");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const base_crud_service_1 = require("../../../common/services/base-crud.service");
const audit_service_1 = require("../../audit/audit.service");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const schema_1 = require("../../../drizzle/schema");
let DepartmentService = class DepartmentService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, cache, companySettings) {
        super(db, audit);
        this.cache = cache;
        this.companySettings = companySettings;
        this.table = schema_1.departments;
        this.parentDept = (0, drizzle_orm_1.aliasedTable)(schema_1.departments, 'parentDept');
    }
    async create(companyId, dto) {
        const existing = await this.db
            .select({ id: schema_1.departments.id })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.name, dto.name), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
            .execute();
        if (existing.length > 0) {
            throw new common_1.BadRequestException(`Department with name ${dto.name} already exists`);
        }
        const [dept] = await this.db
            .insert(schema_1.departments)
            .values({
            name: dto.name,
            description: dto.description,
            companyId,
            parentDepartmentId: dto.parentDepartmentId,
            costCenterId: dto.costCenterId,
            headId: dto.headId,
        })
            .returning({
            id: schema_1.departments.id,
            name: schema_1.departments.name,
            description: schema_1.departments.description,
        })
            .execute();
        await this.companySettings.setSetting(companyId, 'onboarding_departments', true);
        return dept;
    }
    async bulkCreate(companyId, rows) {
        const names = rows.map((r) => r['Name'] ?? r['name']);
        const duplicates = await this.db
            .select({ name: schema_1.departments.name })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.departments.name, names)))
            .execute();
        if (duplicates.length) {
            const duplicateNames = duplicates.map((d) => d.name);
            throw new common_1.BadRequestException(`Department names already exist: ${duplicateNames.join(', ')}`);
        }
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_department_dto_1.CreateDepartmentDto, {
                name: row['Name'] ?? row['name'],
                description: row['Description'] ?? row['description'],
                parentDepartmentId: row['ParentDepartmentId']
                    ? row['ParentDepartmentId']
                    : undefined,
                costCenterId: row['CostCenterId'] ? row['CostCenterId'] : undefined,
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
                name: d.name,
                description: d.description,
                parentDepartmentId: d.parentDepartmentId,
                costCenterId: d.costCenterId,
            }));
            const result = await trx
                .insert(schema_1.departments)
                .values(values)
                .returning({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                description: schema_1.departments.description,
            })
                .execute();
            return result;
        });
        await this.companySettings.setSetting(companyId, 'onboarding_departments', true);
        return inserted;
    }
    async findAll(companyId) {
        const cacheKey = `departments:${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                description: schema_1.departments.description,
                createdAt: schema_1.departments.createdAt,
                head: schema_1.employees.firstName,
                heads_email: schema_1.employees.email,
            })
                .from(schema_1.departments)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.departments.headId))
                .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
                .execute();
        });
    }
    async findOne(companyId, id) {
        const [dept] = await this.db
            .select({
            id: schema_1.departments.id,
            name: schema_1.departments.name,
            description: schema_1.departments.description,
        })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.id, id)))
            .execute();
        if (!dept) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        return dept;
    }
    async update(companyId, id, dto, userId, ip) {
        return this.updateWithAudit(companyId, id, {
            name: dto.name,
            description: dto.description,
            parentDepartmentId: dto.parentDepartmentId,
            costCenterId: dto.costCenterId,
            headId: dto.headId,
        }, {
            entity: 'Department',
            action: 'UpdateDepartment',
            fields: [
                'name',
                'description',
                'parentDepartmentId',
                'costCenterId',
                'headId',
            ],
        }, userId, ip);
    }
    async remove(companyId, id) {
        const [deleted] = await this.db
            .delete(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.id, id)))
            .returning({ id: schema_1.departments.id })
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        return { id: deleted.id };
    }
    async assignHead(companyId, departmentId, headId, userId, ip) {
        const [emp] = await this.db
            .select({ id: schema_1.employees.id })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, headId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .execute();
        if (!emp) {
            throw new common_1.BadRequestException(`Employee ${headId} not found in this company`);
        }
        return this.updateWithAudit(companyId, departmentId, { headId }, {
            entity: 'Department',
            action: 'create',
            fields: ['headId'],
        }, userId, ip);
    }
    async findOneWithHead(companyId, id) {
        const [dept] = await this.db
            .select({
            id: schema_1.departments.id,
            name: schema_1.departments.name,
            description: schema_1.departments.description,
            head: {
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                email: schema_1.employees.email,
            },
        })
            .from(schema_1.departments)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.departments.headId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.id, id), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
            .execute();
        if (!dept)
            throw new common_1.NotFoundException();
        return dept;
    }
    async assignParent(companyId, departmentId, dto, userId, ip) {
        const parentId = dto.parentDepartmentId;
        if (departmentId === parentId) {
            throw new common_1.BadRequestException(`Department cannot be its own parent`);
        }
        const [parent] = await this.db
            .select({ id: schema_1.departments.id })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.id, parentId), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
            .execute();
        if (!parent) {
            throw new common_1.NotFoundException(`Parent department ${parentId} not found`);
        }
        return this.updateWithAudit(companyId, departmentId, { parentDepartmentId: parentId }, {
            entity: 'Department',
            action: 'create',
            fields: ['parentDepartmentId'],
        }, userId, ip);
    }
    async assignCostCenter(companyId, departmentId, dto, userId, ip) {
        const costCenterId = dto.costCenterId;
        const [cc] = await this.db
            .select({ id: schema_1.costCenters.id })
            .from(schema_1.costCenters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.id, costCenterId), (0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId)))
            .execute();
        if (!cc) {
            throw new common_1.NotFoundException(`Cost center ${costCenterId} not found`);
        }
        return this.updateWithAudit(companyId, departmentId, { costCenterId }, {
            entity: 'Department',
            action: 'create',
            fields: ['costCenterId'],
        }, userId, ip);
    }
    async findOneWithRelations(companyId, id) {
        const pd = this.parentDept;
        const [dept] = await this.db
            .select({
            id: schema_1.departments.id,
            name: schema_1.departments.name,
            description: schema_1.departments.description,
            head: {
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
            },
            parent: {
                id: pd.id,
                name: pd.name,
            },
            costCenter: {
                id: schema_1.costCenters.id,
                code: schema_1.costCenters.code,
                name: schema_1.costCenters.name,
                budget: schema_1.costCenters.budget,
            },
        })
            .from(schema_1.departments)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.departments.headId))
            .leftJoin(schema_1.costCenters, (0, drizzle_orm_1.eq)(schema_1.costCenters.id, schema_1.departments.costCenterId))
            .leftJoin(pd, (0, drizzle_orm_1.eq)(pd.id, schema_1.departments.parentDepartmentId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.id, id)))
            .execute();
        if (!dept) {
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        return dept;
    }
    async findAllWithRelations(companyId) {
        const pd = this.parentDept;
        return (this.db
            .select({
            id: schema_1.departments.id,
            name: schema_1.departments.name,
            description: schema_1.departments.description,
            head: {
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
            },
            parent: {
                id: pd.id,
                name: pd.name,
            },
            costCenter: {
                id: schema_1.costCenters.id,
                code: schema_1.costCenters.code,
                name: schema_1.costCenters.name,
                budget: schema_1.costCenters.budget,
            },
        })
            .from(schema_1.departments)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.departments.headId))
            .leftJoin(schema_1.costCenters, (0, drizzle_orm_1.eq)(schema_1.costCenters.id, schema_1.departments.costCenterId))
            .leftJoin(pd, (0, drizzle_orm_1.eq)(pd.id, schema_1.departments.parentDepartmentId))
            .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
            .execute());
    }
    async getHierarchy(companyId) {
        const depts = await this.findAllWithRelations(companyId);
        const map = new Map();
        depts.forEach((d) => map.set(d.id, { ...d, children: [] }));
        const roots = [];
        for (const d of map.values()) {
            if (d.parent?.id && map.has(d.parent.id)) {
                map.get(d.parent.id).children.push(d);
            }
            else {
                roots.push(d);
            }
        }
        return roots;
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        company_settings_service_1.CompanySettingsService])
], DepartmentService);
//# sourceMappingURL=department.service.js.map