"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackModule = void 0;
const common_1 = require("@nestjs/common");
const feedback_service_1 = require("./feedback.service");
const feedback_controller_1 = require("./feedback.controller");
const feedback_settings_controller_1 = require("./feedback-settings/feedback-settings.controller");
const feedback_settings_service_1 = require("./feedback-settings/feedback-settings.service");
const feedback_question_controller_1 = require("./feedback-questions/feedback-question.controller");
const feedback_question_service_1 = require("./feedback-questions/feedback-question.service");
let FeedbackModule = class FeedbackModule {
};
exports.FeedbackModule = FeedbackModule;
exports.FeedbackModule = FeedbackModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            feedback_controller_1.FeedbackController,
            feedback_settings_controller_1.FeedbackSettingsController,
            feedback_question_controller_1.FeedbackQuestionsController,
        ],
        providers: [
            feedback_service_1.FeedbackService,
            feedback_settings_service_1.FeedbackSettingsService,
            feedback_question_service_1.FeedbackQuestionService,
        ],
        exports: [feedback_service_1.FeedbackService, feedback_settings_service_1.FeedbackSettingsService, feedback_question_service_1.FeedbackQuestionService],
    })
], FeedbackModule);
//# sourceMappingURL=feedback.module.js.map