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
exports.PerformancePolicyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const goal_policy_service_1 = require("./goal-policy.service");
const policy_dtos_1 = require("./dto/policy.dtos");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PerformancePolicyController = class PerformancePolicyController extends base_controller_1.BaseController {
    constructor(policy) {
        super();
        this.policy = policy;
    }
    getEffective(user) {
        return this.policy.getEffectivePolicy(user.companyId);
    }
    upsertCompany(user, dto) {
        return this.policy.upsertCompanyPolicy(user.companyId, user.id, dto);
    }
};
exports.PerformancePolicyController = PerformancePolicyController;
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PerformancePolicyController.prototype, "getEffective", null);
__decorate([
    (0, common_1.Patch)('company'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, policy_dtos_1.UpsertCompanyPolicyDto]),
    __metadata("design:returntype", void 0)
], PerformancePolicyController.prototype, "upsertCompany", null);
exports.PerformancePolicyController = PerformancePolicyController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('performance-policies'),
    __metadata("design:paramtypes", [goal_policy_service_1.PolicyService])
], PerformancePolicyController);
//# sourceMappingURL=goal-policy.controller.js.map