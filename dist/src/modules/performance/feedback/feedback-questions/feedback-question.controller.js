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
exports.FeedbackQuestionsController = void 0;
const common_1 = require("@nestjs/common");
const feedback_question_service_1 = require("./feedback-question.service");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const create_feedback_question_dto_1 = require("../dto/create-feedback-question.dto");
const update_feedback_question_dto_1 = require("../dto/update-feedback-question.dto");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let FeedbackQuestionsController = class FeedbackQuestionsController extends base_controller_1.BaseController {
    constructor(questionService) {
        super();
        this.questionService = questionService;
    }
    seedFeedbackQuestions(user) {
        return this.questionService.seedFeedbackQuestions(user.companyId);
    }
    create(dto, user) {
        return this.questionService.create(dto, user);
    }
    findAll(user) {
        return this.questionService.findAll(user.companyId);
    }
    findByType(type, user) {
        return this.questionService.findByType(user.companyId, type);
    }
    findOne(id, user) {
        return this.questionService.findOne(user.companyId, id);
    }
    update(id, dto, user) {
        return this.questionService.update(user.companyId, id, dto);
    }
    remove(id, user) {
        return this.questionService.delete(user.companyId, id);
    }
    reorder(type, payload, user) {
        return this.questionService.reorderQuestionsByType(user.companyId, type, payload.questions);
    }
};
exports.FeedbackQuestionsController = FeedbackQuestionsController;
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "seedFeedbackQuestions", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_feedback_question_dto_1.CreateFeedbackQuestionDto, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('type/:type'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "findByType", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_feedback_question_dto_1.UpdateFeedbackQuestionDto, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('reorder/:type'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FeedbackQuestionsController.prototype, "reorder", null);
exports.FeedbackQuestionsController = FeedbackQuestionsController = __decorate([
    (0, common_1.Controller)('feedback-questions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [feedback_question_service_1.FeedbackQuestionService])
], FeedbackQuestionsController);
//# sourceMappingURL=feedback-question.controller.js.map