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
exports.FeedbackSettingsController = void 0;
const common_1 = require("@nestjs/common");
const feedback_settings_service_1 = require("./feedback-settings.service");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const update_feedback_rule_dto_1 = require("../dto/update-feedback-rule.dto");
let FeedbackSettingsController = class FeedbackSettingsController extends base_controller_1.BaseController {
    constructor(feedbackSettingsService) {
        super();
        this.feedbackSettingsService = feedbackSettingsService;
    }
    findOne(user) {
        return this.feedbackSettingsService.findOne(user.companyId);
    }
    updateTopLevel(dto, user) {
        return this.feedbackSettingsService.update(user.companyId, dto, user);
    }
    updateRule(dto, user) {
        return this.feedbackSettingsService.updateSingleRule(user.companyId, dto, user);
    }
    create() {
        return this.feedbackSettingsService.seedCompanies();
    }
};
exports.FeedbackSettingsController = FeedbackSettingsController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedbackSettingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], FeedbackSettingsController.prototype, "updateTopLevel", null);
__decorate([
    (0, common_1.Patch)('rules'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_feedback_rule_dto_1.UpdateFeedbackRuleDto, Object]),
    __metadata("design:returntype", void 0)
], FeedbackSettingsController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Post)('seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeedbackSettingsController.prototype, "create", null);
exports.FeedbackSettingsController = FeedbackSettingsController = __decorate([
    (0, common_1.Controller)('feedback/settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [feedback_settings_service_1.FeedbackSettingsService])
], FeedbackSettingsController);
//# sourceMappingURL=feedback-settings.controller.js.map