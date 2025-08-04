"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeederModule = void 0;
const common_1 = require("@nestjs/common");
const seeder_controller_1 = require("./seeder.controller");
const seeder_service_1 = require("./seeder.service");
const seeder_service_2 = require("../lifecycle/onboarding/seeder.service");
const offer_letter_service_1 = require("../recruitment/offers/offer-letter/offer-letter.service");
const scorecard_service_1 = require("../recruitment/interviews/scorecard.service");
const email_templates_service_1 = require("../recruitment/interviews/email-templates.service");
const applicationForm_service_1 = require("../recruitment/jobs/applicationForm.service");
const competency_service_1 = require("../performance/templates/seed/competency.service");
const questions_service_1 = require("../performance/templates/seed/questions.service");
let SeederModule = class SeederModule {
};
exports.SeederModule = SeederModule;
exports.SeederModule = SeederModule = __decorate([
    (0, common_1.Module)({
        controllers: [seeder_controller_1.SeedController],
        providers: [
            seeder_service_1.SeedService,
            seeder_service_2.OnboardingSeederService,
            offer_letter_service_1.OfferLetterService,
            scorecard_service_1.ScorecardTemplateService,
            email_templates_service_1.InterviewEmailTemplateService,
            applicationForm_service_1.ApplicationFormService,
            competency_service_1.PerformanceCompetencyService,
            questions_service_1.PerformanceReviewQuestionService,
        ],
    })
], SeederModule);
//# sourceMappingURL=seeder.module.js.map