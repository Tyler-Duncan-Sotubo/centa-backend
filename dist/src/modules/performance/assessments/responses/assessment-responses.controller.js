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
exports.AssessmentResponsesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const responses_service_1 = require("./responses.service");
const save_response_dto_1 = require("./dto/save-response.dto");
const bulk_save_responses_dto_1 = require("./dto/bulk-save-responses.dto");
let AssessmentResponsesController = class AssessmentResponsesController {
    constructor(responsesService) {
        this.responsesService = responsesService;
    }
    getResponses(assessmentId) {
        return this.responsesService.getResponsesForAssessment(assessmentId);
    }
    saveResponse(assessmentId, dto, user) {
        return this.responsesService.saveResponse(assessmentId, dto, user);
    }
    bulkSaveResponses(assessmentId, dto, user) {
        return this.responsesService.bulkSaveResponses(assessmentId, dto, user);
    }
};
exports.AssessmentResponsesController = AssessmentResponsesController;
__decorate([
    (0, common_1.Get)('/:assessmentId'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.read',
        'performance.reviews.read_team',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssessmentResponsesController.prototype, "getResponses", null);
__decorate([
    (0, common_1.Post)(':assessmentId/save'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_self',
        'performance.reviews.submit_peer',
        'performance.reviews.submit_manager',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_response_dto_1.SaveResponseDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentResponsesController.prototype, "saveResponse", null);
__decorate([
    (0, common_1.Post)(':assessmentId/bulk-save'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_self',
        'performance.reviews.submit_peer',
        'performance.reviews.submit_manager',
    ]),
    __param(0, (0, common_1.Param)('assessmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, bulk_save_responses_dto_1.BulkSaveResponsesDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentResponsesController.prototype, "bulkSaveResponses", null);
exports.AssessmentResponsesController = AssessmentResponsesController = __decorate([
    (0, common_1.Controller)('assessment-responses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [responses_service_1.AssessmentResponsesService])
], AssessmentResponsesController);
//# sourceMappingURL=assessment-responses.controller.js.map