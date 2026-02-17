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
exports.SelfAssessmentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const self_assessments_service_1 = require("./self-assessments.service");
let SelfAssessmentsController = class SelfAssessmentsController extends base_controller_1.BaseController {
    constructor(selfAssessmentsService) {
        super();
        this.selfAssessmentsService = selfAssessmentsService;
    }
    getOrCreateForCycle(cycleId, user) {
        return this.selfAssessmentsService.getSelfAssessmentPayload(user, cycleId);
    }
    start(id, user) {
        return this.selfAssessmentsService.startSelfAssessment(user, id);
    }
    submit(id, user) {
        return this.selfAssessmentsService.submitSelfAssessment(user, id);
    }
    upsertSummary(id, body, user) {
        return this.selfAssessmentsService.upsertSelfSummary(user, id, body?.summary ?? '');
    }
};
exports.SelfAssessmentsController = SelfAssessmentsController;
__decorate([
    (0, common_1.Get)(':cycleId'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.submit_self']),
    __param(0, (0, common_1.Param)('cycleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SelfAssessmentsController.prototype, "getOrCreateForCycle", null);
__decorate([
    (0, common_1.Patch)(':id/start'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.submit_self']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SelfAssessmentsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.submit_self']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SelfAssessmentsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/summary'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.submit_self']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SelfAssessmentsController.prototype, "upsertSummary", null);
exports.SelfAssessmentsController = SelfAssessmentsController = __decorate([
    (0, common_1.Controller)('performance-assessments/self'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [self_assessments_service_1.SelfAssessmentsService])
], SelfAssessmentsController);
//# sourceMappingURL=self-assessments.controller.js.map