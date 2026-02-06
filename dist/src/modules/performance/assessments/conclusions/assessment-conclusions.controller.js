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
exports.AssessmentConclusionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const create_conclusion_dto_1 = require("./dto/create-conclusion.dto");
const update_conclusion_dto_1 = require("./dto/update-conclusion.dto");
const conclusions_service_1 = require("./conclusions.service");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let AssessmentConclusionsController = class AssessmentConclusionsController extends base_controller_1.BaseController {
    constructor(conclusionsService) {
        super();
        this.conclusionsService = conclusionsService;
    }
    create(assessmentId, dto, user) {
        return this.conclusionsService.createConclusion(assessmentId, dto, user.id);
    }
    update(assessmentId, dto, user) {
        return this.conclusionsService.updateConclusion(assessmentId, dto, user.id);
    }
    get(assessmentId) {
        return this.conclusionsService.getConclusionByAssessment(assessmentId);
    }
    submitToHr(assessmentId, user) {
        return this.conclusionsService.submitConclusionToHR(assessmentId, user.id);
    }
    requestChanges(assessmentId, note, user) {
        return this.conclusionsService.requestChanges(assessmentId, note, user.id);
    }
    approve(assessmentId, user) {
        return this.conclusionsService.approveConclusion(assessmentId, user.id);
    }
};
exports.AssessmentConclusionsController = AssessmentConclusionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_manager',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_conclusion_dto_1.CreateConclusionDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_manager',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_conclusion_dto_1.UpdateConclusionDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.read',
        'performance.reviews.read_team',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('submit-to-hr'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_manager',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "submitToHr", null);
__decorate([
    (0, common_1.Post)('request-changes'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, common_1.Body)('note')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "requestChanges", null);
__decorate([
    (0, common_1.Post)('approve'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssessmentConclusionsController.prototype, "approve", null);
exports.AssessmentConclusionsController = AssessmentConclusionsController = __decorate([
    (0, common_1.Controller)('assessments/:assessmentId/conclusion'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [conclusions_service_1.AssessmentConclusionsService])
], AssessmentConclusionsController);
//# sourceMappingURL=assessment-conclusions.controller.js.map