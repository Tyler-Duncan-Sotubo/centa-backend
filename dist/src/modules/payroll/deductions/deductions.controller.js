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
exports.DeductionsController = void 0;
const common_1 = require("@nestjs/common");
const deductions_service_1 = require("./deductions.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_deduction_type_dto_1 = require("./dto/create-deduction-type.dto");
const create_employee_deduction_dto_1 = require("./dto/create-employee-deduction.dto");
let DeductionsController = class DeductionsController extends base_controller_1.BaseController {
    constructor(deductionsService) {
        super();
        this.deductionsService = deductionsService;
    }
    createDeductionType(createDeductionTypeDto, user) {
        return this.deductionsService.createDeductionType(user, createDeductionTypeDto);
    }
    findAllDeductionTypes() {
        return this.deductionsService.getDeductionTypes();
    }
    updateDeductionType(user, deductionTypeId, updateDeductionTypeDto) {
        return this.deductionsService.updateDeductionType(user, updateDeductionTypeDto, deductionTypeId);
    }
    removeDeductionType(deductionTypeId, user) {
        return this.deductionsService.deleteDeductionType(deductionTypeId, user.id);
    }
    assignDeductionToEmployee(dto, user) {
        return this.deductionsService.assignDeductionToEmployee(user, dto);
    }
    getAllEmployeeDeductionsForCompany(user) {
        return this.deductionsService.getAllEmployeeDeductionsForCompany(user.companyId);
    }
    getEmployeeDeductions(employeeId) {
        return this.deductionsService.getEmployeeDeductions(employeeId);
    }
    updateEmployeeDeduction(employeeDeductionId, dto, user) {
        return this.deductionsService.updateEmployeeDeduction(user, employeeDeductionId, dto);
    }
    removeEmployeeDeduction(employeeDeductionId, user) {
        return this.deductionsService.removeEmployeeDeduction(employeeDeductionId, user.id);
    }
};
exports.DeductionsController = DeductionsController;
__decorate([
    (0, common_1.Post)('types'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.types.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_deduction_type_dto_1.CreateDeductionTypeDto, Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "createDeductionType", null);
__decorate([
    (0, common_1.Get)('types'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.types.read']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "findAllDeductionTypes", null);
__decorate([
    (0, common_1.Patch)('types/:deductionTypeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.types.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('deductionTypeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_deduction_type_dto_1.CreateDeductionTypeDto]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "updateDeductionType", null);
__decorate([
    (0, common_1.Delete)('types/:deductionTypeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.types.manage']),
    __param(0, (0, common_1.Param)('deductionTypeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "removeDeductionType", null);
__decorate([
    (0, common_1.Post)('employee-deductions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.employee.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_deduction_dto_1.CreateEmployeeDeductionDto, Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "assignDeductionToEmployee", null);
__decorate([
    (0, common_1.Get)('company/employee-deductions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.employee.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "getAllEmployeeDeductionsForCompany", null);
__decorate([
    (0, common_1.Get)('employee-deductions/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.employee.read']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "getEmployeeDeductions", null);
__decorate([
    (0, common_1.Patch)('employee-deductions/:employeeDeductionId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.employee.manage']),
    __param(0, (0, common_1.Param)('employeeDeductionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_employee_deduction_dto_1.CreateEmployeeDeductionDto, Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "updateEmployeeDeduction", null);
__decorate([
    (0, common_1.Delete)('employee-deductions/:employeeDeductionId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.deductions.employee.manage']),
    __param(0, (0, common_1.Param)('employeeDeductionId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DeductionsController.prototype, "removeEmployeeDeduction", null);
exports.DeductionsController = DeductionsController = __decorate([
    (0, common_1.Controller)('deductions'),
    __metadata("design:paramtypes", [deductions_service_1.DeductionsService])
], DeductionsController);
//# sourceMappingURL=deductions.controller.js.map