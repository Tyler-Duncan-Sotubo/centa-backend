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
var DepartmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
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
let DepartmentService = DepartmentService_1 = class DepartmentService extends base_crud_service_1.BaseCrudService {
    constructor(db, audit, cache, companySettings, logger) {
        super(db, audit);
        this.cache = cache;
        this.companySettings = companySettings;
        this.logger = logger;
        this.table = schema_1.departments;
        this.parentDept = (0, drizzle_orm_1.aliasedTable)(schema_1.departments, 'parentDept');
        this.logger.setContext(DepartmentService_1.name);
    }
    keys(companyId) {
        return {
            list: `departments:list:${companyId}`,
            listWithRelations: `departments:relations:list:${companyId}`,
            hierarchy: `departments:hierarchy:${companyId}`,
            one: (id) => `departments:one:${companyId}:${id}`,
            oneWithRelations: (id) => `departments:relations:one:${companyId}:${id}`,
        };
    }
    async invalidateCacheKeys(companyId, opts) {
        const k = this.keys(companyId);
        const keys = [
            k.list,
            k.listWithRelations,
            k.hierarchy,
            opts?.id ? k.one(opts.id) : null,
            opts?.id ? k.oneWithRelations(opts.id) : null,
        ].filter(Boolean);
        this.logger.debug({ companyId, keys, departmentId: opts?.id }, 'cache:invalidate:start');
        await Promise.all(keys.map(async (key) => {
            await this.cache.del?.(key);
            await this.cache.del?.(key);
        }));
        this.logger.debug({ companyId, departmentId: opts?.id }, 'cache:invalidate:done');
    }
    async create(companyId, dto) {
        this.logger.info({ companyId, dto }, 'departments:create:start');
        const existing = await this.db
            .select({ id: schema_1.departments.id })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.name, dto.name), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId, name: dto.name }, 'departments:create:duplicate-name');
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
        await this.invalidateCacheKeys(companyId);
        this.logger.info({ companyId, departmentId: dept.id }, 'departments:create:done');
        return dept;
    }
    async bulkCreate(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'departments:bulkCreate:start');
        const names = rows.map((r) => r['Name'] ?? r['name']);
        const duplicates = await this.db
            .select({ name: schema_1.departments.name })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.departments.name, names)))
            .execute();
        if (duplicates.length) {
            const duplicateNames = duplicates.map((d) => d.name);
            this.logger.warn({ companyId, duplicateNames }, 'departments:bulkCreate:duplicates');
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
                this.logger.warn({ companyId, errors }, 'departments:bulkCreate:validation-error');
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
        await this.invalidateCacheKeys(companyId);
        this.logger.info({ companyId, created: inserted.length }, 'departments:bulkCreate:done');
        return inserted;
    }
    async update(companyId, id, dto, userId, ip) {
        this.logger.info({ companyId, departmentId: id, dto, userId, ip }, 'departments:update:start');
        const res = await this.updateWithAudit(companyId, id, {
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
        await this.invalidateCacheKeys(companyId, { id });
        this.logger.info({ companyId, departmentId: id }, 'departments:update:done');
        return res;
    }
    async remove(companyId, id) {
        this.logger.info({ companyId, departmentId: id }, 'departments:remove:start');
        const [{ empCount }] = await this.db
            .select({
            empCount: (0, drizzle_orm_1.sql) `CAST(COUNT(*) AS int)`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, id)))
            .execute();
        if (empCount > 0) {
            this.logger.warn({ companyId, departmentId: id, empCount }, 'departments:remove:blocked:employees');
            throw new common_1.BadRequestException(`Cannot delete department: ${empCount} employee(s) are assigned to it.`);
        }
        const [{ childCount }] = await this.db
            .select({
            childCount: (0, drizzle_orm_1.sql) `CAST(COUNT(*) AS int)`,
        })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.parentDepartmentId, id)))
            .execute();
        if (childCount > 0) {
            this.logger.warn({ companyId, departmentId: id, childCount }, 'departments:remove:blocked:children');
            throw new common_1.BadRequestException(`Cannot delete department: ${childCount} sub-department(s) reference it.`);
        }
        const [deleted] = await this.db
            .delete(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.id, id)))
            .returning({ id: schema_1.departments.id })
            .execute();
        if (!deleted) {
            this.logger.warn({ companyId, departmentId: id }, 'departments:remove:not-found');
            throw new common_1.NotFoundException(`Department ${id} not found`);
        }
        await this.invalidateCacheKeys(companyId, { id });
        this.logger.info({ companyId, departmentId: id }, 'departments:remove:done');
        return { id: deleted.id };
    }
    async assignHead(companyId, departmentId, headId, userId, ip) {
        this.logger.info({ companyId, departmentId, headId, userId }, 'departments:assignHead:start');
        const [emp] = await this.db
            .select({ id: schema_1.employees.id })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, headId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .execute();
        if (!emp) {
            this.logger.warn({ companyId, departmentId, headId }, 'departments:assignHead:employee-not-found');
            throw new common_1.BadRequestException(`Employee ${headId} not found in this company`);
        }
        const res = await this.updateWithAudit(companyId, departmentId, { headId }, {
            entity: 'Department',
            action: 'AssignHead',
            fields: ['headId'],
        }, userId, ip);
        await this.invalidateCacheKeys(companyId, { id: departmentId });
        this.logger.info({ companyId, departmentId, headId }, 'departments:assignHead:done');
        return res;
    }
    async assignParent(companyId, departmentId, dto, userId, ip) {
        const parentId = dto.parentDepartmentId;
        this.logger.info({ companyId, departmentId, parentId, userId }, 'departments:assignParent:start');
        if (departmentId === parentId) {
            this.logger.warn({ companyId, departmentId, parentId }, 'departments:assignParent:self-parenting');
            throw new common_1.BadRequestException(`Department cannot be its own parent`);
        }
        const [parent] = await this.db
            .select({ id: schema_1.departments.id })
            .from(schema_1.departments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.id, parentId), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
            .execute();
        if (!parent) {
            this.logger.warn({ companyId, departmentId, parentId }, 'departments:assignParent:parent-not-found');
            throw new common_1.NotFoundException(`Parent department ${parentId} not found`);
        }
        const res = await this.updateWithAudit(companyId, departmentId, { parentDepartmentId: parentId }, {
            entity: 'Department',
            action: 'AssignParent',
            fields: ['parentDepartmentId'],
        }, userId, ip);
        await this.invalidateCacheKeys(companyId, { id: departmentId });
        this.logger.info({ companyId, departmentId, parentId }, 'departments:assignParent:done');
        return res;
    }
    async assignCostCenter(companyId, departmentId, dto, userId, ip) {
        const costCenterId = dto.costCenterId;
        this.logger.info({ companyId, departmentId, costCenterId, userId }, 'departments:assignCostCenter:start');
        const [cc] = await this.db
            .select({ id: schema_1.costCenters.id })
            .from(schema_1.costCenters)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.costCenters.id, costCenterId), (0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId)))
            .execute();
        if (!cc) {
            this.logger.warn({ companyId, departmentId, costCenterId }, 'departments:assignCostCenter:cc-not-found');
            throw new common_1.NotFoundException(`Cost center ${costCenterId} not found`);
        }
        const res = await this.updateWithAudit(companyId, departmentId, { costCenterId }, {
            entity: 'Department',
            action: 'AssignCostCenter',
            fields: ['costCenterId'],
        }, userId, ip);
        await this.invalidateCacheKeys(companyId, { id: departmentId });
        this.logger.info({ companyId, departmentId, costCenterId }, 'departments:assignCostCenter:done');
        return res;
    }
    async findAll(companyId) {
        const cacheKey = this.keys(companyId).list;
        this.logger.debug({ companyId, cacheKey }, 'departments:findAll:start');
        const data = await this.cache.getOrSetCache(cacheKey, async () => {
            const allDepartments = await this.db
                .select({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                description: schema_1.departments.description,
                createdAt: schema_1.departments.createdAt,
                head: {
                    id: schema_1.employees.id,
                    name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                    email: schema_1.employees.email,
                    avatarUrl: schema_1.users.avatar,
                },
            })
                .from(schema_1.departments)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.departments.headId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
                .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
                .execute();
            const allEmployees = await this.db
                .select({
                id: schema_1.employees.id,
                name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                email: schema_1.employees.email,
                departmentId: schema_1.employees.departmentId,
                avatarUrl: schema_1.users.avatar,
            })
                .from(schema_1.employees)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
                .where((0, drizzle_orm_1.inArray)(schema_1.employees.departmentId, allDepartments.map((d) => d.id)))
                .execute();
            const deptIdToEmployees = allEmployees.reduce((acc, emp) => {
                if (emp.departmentId !== null && emp.departmentId !== undefined) {
                    (acc[emp.departmentId] = acc[emp.departmentId] || []).push(emp);
                }
                return acc;
            }, {});
            return allDepartments.map((dept) => ({
                ...dept,
                head: dept.head && dept.head.id ? dept.head : null,
                employees: deptIdToEmployees[dept.id] || [],
            }));
        });
        this.logger.debug({ companyId, count: data.length }, 'departments:findAll:done');
        return data;
    }
    async findOne(companyId, id) {
        const cacheKey = this.keys(companyId).one(id);
        this.logger.debug({ companyId, departmentId: id, cacheKey }, 'departments:findOne:start');
        const dept = await this.cache.getOrSetCache(cacheKey, async () => {
            const [row] = await this.db
                .select({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                description: schema_1.departments.description,
            })
                .from(schema_1.departments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.departments.id, id)))
                .execute();
            if (!row) {
                this.logger.warn({ companyId, departmentId: id }, 'departments:findOne:not-found');
                throw new common_1.NotFoundException(`Department ${id} not found`);
            }
            return row;
        });
        this.logger.debug({ companyId, departmentId: id }, 'departments:findOne:done');
        return dept;
    }
    async findOneWithHead(companyId, id) {
        const cacheKey = this.keys(companyId).oneWithRelations(id);
        this.logger.debug({ companyId, departmentId: id, cacheKey }, 'departments:findOneWithHead:start');
        const dept = await this.cache.getOrSetCache(cacheKey, async () => {
            const [row] = await this.db
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
            if (!row) {
                this.logger.warn({ companyId, departmentId: id }, 'departments:findOneWithHead:not-found');
                throw new common_1.NotFoundException();
            }
            return row;
        });
        this.logger.debug({ companyId, departmentId: id }, 'departments:findOneWithHead:done');
        return dept;
    }
    async findOneWithRelations(companyId, id) {
        const cacheKey = this.keys(companyId).oneWithRelations(id);
        const pd = this.parentDept;
        this.logger.debug({ companyId, departmentId: id, cacheKey }, 'departments:findOneWithRelations:start');
        const dept = await this.cache.getOrSetCache(cacheKey, async () => {
            const [row] = await this.db
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
            if (!row) {
                this.logger.warn({ companyId, departmentId: id }, 'departments:findOneWithRelations:not-found');
                throw new common_1.NotFoundException(`Department ${id} not found`);
            }
            return row;
        });
        this.logger.debug({ companyId, departmentId: id }, 'departments:findOneWithRelations:done');
        return dept;
    }
    async findAllWithRelations(companyId) {
        const cacheKey = this.keys(companyId).listWithRelations;
        const pd = this.parentDept;
        this.logger.debug({ companyId, cacheKey }, 'departments:findAllWithRelations:start');
        const rows = await this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
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
                .execute();
        });
        this.logger.debug({ companyId, count: rows.length }, 'departments:findAllWithRelations:done');
        return rows;
    }
    async getHierarchy(companyId) {
        const cacheKey = this.keys(companyId).hierarchy;
        this.logger.debug({ companyId, cacheKey }, 'departments:getHierarchy:start');
        const tree = await this.cache.getOrSetCache(cacheKey, async () => {
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
        });
        this.logger.debug({ companyId, rootCount: tree.length }, 'departments:getHierarchy:done');
        return tree;
    }
};
exports.DepartmentService = DepartmentService;
exports.DepartmentService = DepartmentService = DepartmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        company_settings_service_1.CompanySettingsService,
        nestjs_pino_1.PinoLogger])
], DepartmentService);
//# sourceMappingURL=department.service.js.map