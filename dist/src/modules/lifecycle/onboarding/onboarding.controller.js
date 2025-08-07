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
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const onboarding_service_1 = require("./onboarding.service");
const seeder_service_1 = require("./seeder.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const employee_onboarding_input_dto_1 = require("./dto/employee-onboarding-input.dto");
let OnboardingController = class OnboardingController extends base_controller_1.BaseController {
    constructor(onboardingService, seeder) {
        super();
        this.onboardingService = onboardingService;
        this.seeder = seeder;
    }
    getEmployeesInOnboarding(user) {
        return this.onboardingService.getEmployeesInOnboarding(user.companyId);
    }
    createEmployeeOnboarding(user, dto) {
        return this.onboardingService.saveEmployeeOnboardingData(dto.employeeId, dto);
    }
    getEmployeeOnboardingDetail(user, employeeId) {
        return this.onboardingService.getEmployeeOnboardingDetail(user.companyId, employeeId);
    }
    updateEmployeeChecklist(employeeId, checklistId, status) {
        return this.onboardingService.updateChecklistStatus(employeeId, checklistId, status);
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Get)('employees'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "getEmployeesInOnboarding", null);
__decorate([
    (0, common_1.Post)('employee'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, employee_onboarding_input_dto_1.EmployeeOnboardingInputDto]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "createEmployeeOnboarding", null);
__decorate([
    (0, common_1.Get)('employees-onboarding/:employeeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "getEmployeeOnboardingDetail", null);
__decorate([
    (0, common_1.Patch)('employee-checklist/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)('checklistId')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "updateEmployeeChecklist", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('onboarding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService,
        seeder_service_1.OnboardingSeederService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map