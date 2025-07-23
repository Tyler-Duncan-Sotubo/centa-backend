"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewsModule = void 0;
const common_1 = require("@nestjs/common");
const interviews_service_1 = require("./interviews.service");
const interviews_controller_1 = require("./interviews.controller");
const scorecard_service_1 = require("./scorecard.service");
const email_templates_service_1 = require("./email-templates.service");
let InterviewsModule = class InterviewsModule {
};
exports.InterviewsModule = InterviewsModule;
exports.InterviewsModule = InterviewsModule = __decorate([
    (0, common_1.Module)({
        controllers: [interviews_controller_1.InterviewsController],
        providers: [
            interviews_service_1.InterviewsService,
            scorecard_service_1.ScorecardTemplateService,
            email_templates_service_1.InterviewEmailTemplateService,
        ],
    })
], InterviewsModule);
//# sourceMappingURL=interviews.module.js.map