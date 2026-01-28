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
exports.OrgChartService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
let OrgChartService = class OrgChartService {
    constructor(db) {
        this.db = db;
        this.baseSelect = {
            id: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            managerId: schema_1.employees.managerId,
            jobRoleTitle: schema_1.jobRoles.title,
            departmentName: schema_1.departments.name,
            departmentId: schema_1.departments.id,
            avatar: schema_1.users.avatar,
            isDepartmentHead: (0, drizzle_orm_1.sql) `${schema_1.departments.headId} = ${schema_1.employees.id}`,
        };
    }
    async getRoots(companyId) {
        const roots = await this.db
            .select(this.baseSelect)
            .from(schema_1.employees)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.employees.managerId)));
        const rootsWithCounts = await this.attachChildCounts(companyId, roots);
        const rootIds = rootsWithCounts.map((r) => r.id);
        if (!rootIds.length)
            return rootsWithCounts;
        const children = await this.db
            .select(this.baseSelect)
            .from(schema_1.employees)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.managerId, rootIds)));
        const childrenWithCounts = await this.attachChildCounts(companyId, children);
        const byManager = new Map();
        for (const c of childrenWithCounts) {
            if (!c.managerId)
                continue;
            const arr = byManager.get(c.managerId) ?? [];
            arr.push(c);
            byManager.set(c.managerId, arr);
        }
        return rootsWithCounts.map((r) => ({
            ...r,
            children: byManager.get(r.id) ?? [],
        }));
    }
    async getChildren(companyId, managerId) {
        const kids = await this.db
            .select(this.baseSelect)
            .from(schema_1.employees)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.managerId, managerId)));
        return this.attachChildCounts(companyId, kids);
    }
    async getPreview(companyId, depth = 4) {
        if (depth < 1)
            return [];
        const rootRows = await this.db
            .select(this.baseSelect)
            .from(schema_1.employees)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.employees.managerId)));
        const roots = await this.attachChildCounts(companyId, rootRows);
        if (!roots.length || depth === 1)
            return roots;
        const nodeById = new Map();
        for (const r of roots)
            nodeById.set(r.id, r);
        let currentLevelIds = roots.map((r) => r.id);
        for (let level = 2; level <= depth; level++) {
            if (!currentLevelIds.length)
                break;
            const childRows = await this.db
                .select(this.baseSelect)
                .from(schema_1.employees)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.managerId, currentLevelIds)));
            const children = await this.attachChildCounts(companyId, childRows);
            if (!children.length)
                break;
            const nextLevelIds = [];
            for (const c of children) {
                nodeById.set(c.id, c);
                nextLevelIds.push(c.id);
                if (!c.managerId)
                    continue;
                const parent = nodeById.get(c.managerId);
                if (parent)
                    parent.children = [...(parent.children ?? []), c];
            }
            currentLevelIds = nextLevelIds;
        }
        return roots;
    }
    async getEmployeeOrgChart(companyId, employeeId) {
        const [empRow] = await this.db
            .select(this.baseSelect)
            .from(schema_1.employees)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId)))
            .limit(1);
        if (!empRow)
            throw new common_1.NotFoundException('Employee not found');
        const chainRows = [empRow];
        let cursor = empRow.managerId;
        for (let i = 0; i < 25 && cursor; i++) {
            const [mgr] = await this.db
                .select(this.baseSelect)
                .from(schema_1.employees)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_1.users.id))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.id, cursor)))
                .limit(1);
            if (!mgr)
                break;
            chainRows.push(mgr);
            cursor = mgr.managerId;
        }
        const chainDtos = await this.attachChildCounts(companyId, chainRows);
        const chain = [...chainDtos].reverse();
        const focus = chain[chain.length - 1];
        const directReports = await this.getChildren(companyId, employeeId);
        return { chain, focus, directReports };
    }
    async attachChildCounts(companyId, rows) {
        if (!rows.length)
            return [];
        const ids = rows.map((r) => r.id);
        const counts = await this.db
            .select({
            managerId: schema_1.employees.managerId,
            count: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.managerId, ids)))
            .groupBy(schema_1.employees.managerId);
        const countById = new Map();
        for (const c of counts) {
            if (c.managerId)
                countById.set(c.managerId, Number(c.count ?? 0));
        }
        return rows.map((r) => {
            const childrenCount = countById.get(r.id) ?? 0;
            return {
                id: r.id,
                name: `${r.firstName} ${r.lastName}`.trim(),
                title: r.jobRoleTitle ?? '',
                department: r.departmentName ?? '',
                managerId: r.managerId ?? null,
                avatar: r.avatar ?? null,
                isDepartmentHead: Boolean(r.isDepartmentHead),
                childrenCount,
                hasChildren: childrenCount > 0,
                children: [],
            };
        });
    }
};
exports.OrgChartService = OrgChartService;
exports.OrgChartService = OrgChartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OrgChartService);
//# sourceMappingURL=org-chart.service.js.map