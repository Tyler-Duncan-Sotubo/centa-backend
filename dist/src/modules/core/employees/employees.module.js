"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesModule = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("./employees.service");
const employees_controller_1 = require("./employees.controller");
const profile_module_1 = require("./profile/profile.module");
const dependents_module_1 = require("./dependents/dependents.module");
const history_module_1 = require("./history/history.module");
const certifications_module_1 = require("./certifications/certifications.module");
const finance_module_1 = require("./finance/finance.module");
const compensation_module_1 = require("./compensation/compensation.module");
const groups_module_1 = require("./groups/groups.module");
const permissions_service_1 = require("../../auth/permissions/permissions.service");
const onboarding_service_1 = require("../../lifecycle/onboarding/onboarding.service");
let EmployeesModule = class EmployeesModule {
};
exports.EmployeesModule = EmployeesModule;
exports.EmployeesModule = EmployeesModule = __decorate([
    (0, common_1.Module)({
        controllers: [employees_controller_1.EmployeesController],
        providers: [employees_service_1.EmployeesService, permissions_service_1.PermissionsService, onboarding_service_1.OnboardingService],
        imports: [
            profile_module_1.ProfileModule,
            dependents_module_1.DependentsModule,
            history_module_1.HistoryModule,
            certifications_module_1.CertificationsModule,
            finance_module_1.FinanceModule,
            compensation_module_1.CompensationModule,
            groups_module_1.GroupsModule,
        ],
        exports: [
            employees_service_1.EmployeesService,
            profile_module_1.ProfileModule,
            dependents_module_1.DependentsModule,
            history_module_1.HistoryModule,
            certifications_module_1.CertificationsModule,
            finance_module_1.FinanceModule,
            compensation_module_1.CompensationModule,
            groups_module_1.GroupsModule,
        ],
    })
], EmployeesModule);
//# sourceMappingURL=employees.module.js.map