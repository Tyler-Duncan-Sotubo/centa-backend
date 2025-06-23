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
exports.OffCycleController = void 0;
const common_1 = require("@nestjs/common");
const off_cycle_service_1 = require("./off-cycle.service");
const create_off_cycle_dto_1 = require("./dto/create-off-cycle.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const run_off_cylce_dto_1 = require("./dto/run-off-cylce.dto");
let OffCycleController = class OffCycleController extends base_controller_1.BaseController {
    constructor(offCycleService) {
        super();
        this.offCycleService = offCycleService;
    }
    create(createOffCycleDto, user) {
        return this.offCycleService.create(createOffCycleDto, user);
    }
    findAll(user, payrollDate) {
        return this.offCycleService.findAll(user.companyId, payrollDate);
    }
    runOffCycle(dto, user, runId) {
        return this.offCycleService.calculateAndPersistOffCycle(runId, user, dto.payrollDate);
    }
    remove(id, user) {
        return this.offCycleService.remove(id, user);
    }
};
exports.OffCycleController = OffCycleController;
__decorate([
    (0, common_1.Post)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.off_cycle.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_off_cycle_dto_1.CreateOffCycleDto, Object]),
    __metadata("design:returntype", void 0)
], OffCycleController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.off_cycle.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('payrollDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OffCycleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('run-off-cycle/:runId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.off_cycle.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('runId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [run_off_cylce_dto_1.PayrollRunDto, Object, String]),
    __metadata("design:returntype", void 0)
], OffCycleController.prototype, "runOffCycle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.off_cycle.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OffCycleController.prototype, "remove", null);
exports.OffCycleController = OffCycleController = __decorate([
    (0, common_1.Controller)('off-cycle'),
    __metadata("design:paramtypes", [off_cycle_service_1.OffCycleService])
], OffCycleController);
//# sourceMappingURL=off-cycle.controller.js.map