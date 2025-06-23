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
exports.BenefitPlanController = void 0;
const common_1 = require("@nestjs/common");
const benefit_plan_service_1 = require("./benefit-plan.service");
const create_benefit_plan_dto_1 = require("./dto/create-benefit-plan.dto");
const update_benefit_plan_dto_1 = require("./dto/update-benefit-plan.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const enroll_employee_dto_1 = require("./dto/enroll-employee.dto");
const single_employee_enroll_dto_1 = require("./dto/single-employee-enroll.dto");
let BenefitPlanController = class BenefitPlanController extends base_controller_1.BaseController {
    constructor(benefitPlanService) {
        super();
        this.benefitPlanService = benefitPlanService;
    }
    create(createBenefitPlanDto, user) {
        return this.benefitPlanService.create(createBenefitPlanDto, user);
    }
    findAll(user) {
        return this.benefitPlanService.findAll(user.companyId);
    }
    findOne(id) {
        return this.benefitPlanService.findOne(id);
    }
    update(id, updateBenefitPlanDto, user) {
        return this.benefitPlanService.update(id, updateBenefitPlanDto, user);
    }
    remove(id, user) {
        return this.benefitPlanService.remove(id, user);
    }
    getEmployeeEnrollments(user, employeeId) {
        return this.benefitPlanService.getEmployeeBenefitEnrollments(employeeId, user);
    }
    getEnrollments(user, employeeId, dto) {
        return this.benefitPlanService.selfEnrollToBenefitPlan(employeeId, dto, user);
    }
    removeEnrollment(user, employeeId, benefitPlanId) {
        return this.benefitPlanService.optOutOfBenefitPlan(employeeId, benefitPlanId, user);
    }
    enrollEmployees(enrollBenefitPlanDto, user) {
        return this.benefitPlanService.enrollEmployeesToBenefitPlan(enrollBenefitPlanDto, user);
    }
    removeEmployeesFromBenefit(dto, user) {
        return this.benefitPlanService.removeEmployeesFromBenefitPlan(dto, user);
    }
};
exports.BenefitPlanController = BenefitPlanController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_plans.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_benefit_plan_dto_1.CreateBenefitPlanDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_plans.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_benefit_plan_dto_1.UpdateBenefitPlanDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_plans.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('enrollments/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.enroll']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "getEmployeeEnrollments", null);
__decorate([
    (0, common_1.Post)('enrollments/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.enroll']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, single_employee_enroll_dto_1.SingleEnrollBenefitDto]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "getEnrollments", null);
__decorate([
    (0, common_1.Patch)('enrollments/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.enroll']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Body)('benefitPlanId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "removeEnrollment", null);
__decorate([
    (0, common_1.Post)('enroll/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.enroll']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [enroll_employee_dto_1.EnrollBenefitPlanDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "enrollEmployees", null);
__decorate([
    (0, common_1.Delete)('remove/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefits.enroll']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [enroll_employee_dto_1.EnrollBenefitPlanDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitPlanController.prototype, "removeEmployeesFromBenefit", null);
exports.BenefitPlanController = BenefitPlanController = __decorate([
    (0, common_1.Controller)('benefit-plan'),
    __metadata("design:paramtypes", [benefit_plan_service_1.BenefitPlanService])
], BenefitPlanController);
//# sourceMappingURL=benefit-plan.controller.js.map