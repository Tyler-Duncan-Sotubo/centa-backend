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
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const build_org_tree_1 = require("./utils/build-org-tree");
const schema_2 = require("../../../drizzle/schema");
let OrgChartService = class OrgChartService {
    constructor(db) {
        this.db = db;
    }
    async buildOrgChart(companyId) {
        const [ceoUser] = await this.db
            .select({
            id: schema_2.users.id,
            firstName: schema_2.users.firstName,
            lastName: schema_2.users.lastName,
        })
            .from(schema_2.users)
            .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_2.companyRoles.name, 'super_admin'))
            .limit(1);
        const allEmployees = await this.db
            .select({
            id: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            managerId: schema_1.employees.managerId,
            jobRoleTitle: schema_1.jobRoles.title,
            departmentName: schema_1.departments.name,
            head: schema_1.departments.headId,
        })
            .from(schema_1.employees)
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId));
        const orgNodes = [];
        orgNodes.push({
            id: ceoUser.id,
            name: `${ceoUser.firstName} ${ceoUser.lastName}`,
            title: 'CEO',
            department: '',
            managerId: null,
            children: [],
        });
        allEmployees.forEach((emp) => {
            orgNodes.push({
                id: emp.id,
                name: `${emp.firstName} ${emp.lastName}`,
                title: emp.jobRoleTitle ?? '',
                department: emp.departmentName ?? '',
                managerId: emp.managerId ?? ceoUser.id,
                children: [],
            });
        });
        const tree = (0, build_org_tree_1.buildOrgTree)(orgNodes);
        return this.mapToDto(tree);
    }
    mapToDto(nodes) {
        return nodes.map((node) => ({
            id: node.id,
            name: node.name,
            title: node.title,
            department: node.department,
            managerId: node.managerId,
            children: this.mapToDto(node.children),
        }));
    }
};
exports.OrgChartService = OrgChartService;
exports.OrgChartService = OrgChartService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OrgChartService);
//# sourceMappingURL=org-chart.service.js.map