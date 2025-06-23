"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const company_module_1 = require("./company/company.module");
const department_module_1 = require("./department/department.module");
const cost_centers_module_1 = require("./cost-centers/cost-centers.module");
const job_roles_module_1 = require("./job-roles/job-roles.module");
const employees_module_1 = require("./employees/employees.module");
const org_chart_module_1 = require("./org-chart/org-chart.module");
const lifecycle_module_1 = require("../lifecycle/lifecycle.module");
let CoreModule = class CoreModule {
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Module)({
        controllers: [],
        providers: [],
        imports: [
            company_module_1.CompanyModule,
            department_module_1.DepartmentModule,
            cost_centers_module_1.CostCentersModule,
            job_roles_module_1.JobRolesModule,
            employees_module_1.EmployeesModule,
            org_chart_module_1.OrgChartModule,
            lifecycle_module_1.LifecycleModule,
        ],
        exports: [
            company_module_1.CompanyModule,
            department_module_1.DepartmentModule,
            cost_centers_module_1.CostCentersModule,
            job_roles_module_1.JobRolesModule,
            employees_module_1.EmployeesModule,
            org_chart_module_1.OrgChartModule,
        ],
    })
], CoreModule);
//# sourceMappingURL=core.module.js.map