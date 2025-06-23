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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const create_finance_dto_1 = require("./dto/create-finance.dto");
const audit_decorator_1 = require("../../../audit/audit.decorator");
const audit_interceptor_1 = require("../../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let FinanceController = class FinanceController extends base_controller_1.BaseController {
    constructor(financeService) {
        super();
        this.financeService = financeService;
    }
    create(employeeId, dto, user, ip) {
        return this.financeService.upsert(employeeId, dto, user.id, ip);
    }
    findOne(id) {
        return this.financeService.findOne(id);
    }
    remove(id) {
        return this.financeService.remove(id);
    }
    verifyAccount(accountNumber, bankCode) {
        return this.financeService.verifyBankAccount(accountNumber, bankCode);
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Post)(':employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager', 'employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_finance_dto_1.CreateFinanceDto, Object, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'EmployeeFinancials',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('verify-account/:accountNumber/:bankCode'),
    __param(0, (0, common_1.Param)('accountNumber')),
    __param(1, (0, common_1.Param)('bankCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "verifyAccount", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('employee-finance'),
    __metadata("design:paramtypes", [finance_service_1.FinanceService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map