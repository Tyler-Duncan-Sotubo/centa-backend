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
exports.InterviewsController = void 0;
const common_1 = require("@nestjs/common");
const interviews_service_1 = require("./interviews.service");
const scorecard_service_1 = require("./scorecard.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const create_score_card_dto_1 = require("./dto/create-score-card.dto");
const feedback_score_dto_1 = require("./dto/feedback-score.dto");
const schedule_interview_dto_1 = require("./dto/schedule-interview.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const email_templates_service_1 = require("./email-templates.service");
const email_template_dto_1 = require("./dto/email-template.dto");
let InterviewsController = class InterviewsController extends base_controller_1.BaseController {
    constructor(interviewsService, scoreCard, emailTemplatesService) {
        super();
        this.interviewsService = interviewsService;
        this.scoreCard = scoreCard;
        this.emailTemplatesService = emailTemplatesService;
    }
    scheduleInterview(dto) {
        return this.interviewsService.scheduleInterview(dto);
    }
    rescheduleInterview(interviewId, dto) {
        return this.interviewsService.rescheduleInterview(interviewId, dto);
    }
    listAllInterviews(user) {
        return this.interviewsService.findAllInterviews(user.companyId);
    }
    getInterviewDetails(interviewId) {
        return this.interviewsService.getInterviewDetails(interviewId);
    }
    submitInterviewFeedback(interviewId, dto, user) {
        return this.interviewsService.upsertInterviewFeedback(interviewId, dto.scores, user);
    }
    listInterviewsForApplication(applicationId) {
        return this.interviewsService.listInterviewsForApplication(applicationId);
    }
    listInterviewerFeedback(interviewId) {
        return this.interviewsService.listInterviewerFeedback(interviewId);
    }
    getAllScorecards(user) {
        return this.scoreCard.getAllTemplates(user.companyId);
    }
    createScorecardTemplate(dto, user) {
        return this.scoreCard.create(user, dto);
    }
    deleteScorecardTemplate(templateId, user) {
        return this.scoreCard.deleteTemplate(templateId, user);
    }
    cloneScorecardTemplate(templateId, user) {
        return this.scoreCard.cloneTemplate(templateId, user);
    }
    getAllEmailTemplates(user) {
        return this.emailTemplatesService.getAllTemplates(user.companyId);
    }
    createEmailTemplate(dto, user) {
        return this.emailTemplatesService.create(user, dto);
    }
    cloneEmailTemplate(templateId, user) {
        return this.emailTemplatesService.cloneTemplate(templateId, user);
    }
    deleteEmailTemplate(templateId, user) {
        return this.emailTemplatesService.deleteTemplate(templateId, user);
    }
};
exports.InterviewsController = InterviewsController;
__decorate([
    (0, common_1.Post)('schedule'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.schedule']),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_interview_dto_1.ScheduleInterviewDto]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "scheduleInterview", null);
__decorate([
    (0, common_1.Patch)(':interviewId/reschedule'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.schedule']),
    __param(0, (0, common_1.Param)('interviewId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedule_interview_dto_1.ScheduleInterviewDto]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "rescheduleInterview", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "listAllInterviews", null);
__decorate([
    (0, common_1.Get)(':interviewId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.read']),
    __param(0, (0, common_1.Param)('interviewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "getInterviewDetails", null);
__decorate([
    (0, common_1.Post)(':interviewId/feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.submit_feedback']),
    __param(0, (0, common_1.Param)('interviewId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, feedback_score_dto_1.SubmitFeedbackDto, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "submitInterviewFeedback", null);
__decorate([
    (0, common_1.Get)('application/:applicationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.read']),
    __param(0, (0, common_1.Param)('applicationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "listInterviewsForApplication", null);
__decorate([
    (0, common_1.Get)(':interviewId/feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.read']),
    __param(0, (0, common_1.Param)('interviewId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "listInterviewerFeedback", null);
__decorate([
    (0, common_1.Get)('scorecards-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "getAllScorecards", null);
__decorate([
    (0, common_1.Post)('scorecards-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_score_card_dto_1.CreateScorecardTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "createScorecardTemplate", null);
__decorate([
    (0, common_1.Delete)('scorecards-templates/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "deleteScorecardTemplate", null);
__decorate([
    (0, common_1.Post)('scorecards-templates/clone'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Body)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "cloneScorecardTemplate", null);
__decorate([
    (0, common_1.Get)('email-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "getAllEmailTemplates", null);
__decorate([
    (0, common_1.Post)('email-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [email_template_dto_1.CreateEmailTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "createEmailTemplate", null);
__decorate([
    (0, common_1.Post)('email-templates/clone'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Body)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "cloneEmailTemplate", null);
__decorate([
    (0, common_1.Delete)('email-templates/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['interviews.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InterviewsController.prototype, "deleteEmailTemplate", null);
exports.InterviewsController = InterviewsController = __decorate([
    (0, common_1.Controller)('interviews'),
    __metadata("design:paramtypes", [interviews_service_1.InterviewsService,
        scorecard_service_1.ScorecardTemplateService,
        email_templates_service_1.InterviewEmailTemplateService])
], InterviewsController);
//# sourceMappingURL=interviews.controller.js.map