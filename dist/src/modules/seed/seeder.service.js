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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const permissions_service_1 = require("../auth/permissions/permissions.service");
const pipeline_seeder_service_1 = require("../recruitment/pipeline/pipeline-seeder.service");
const offer_letter_service_1 = require("../recruitment/offers/offer-letter/offer-letter.service");
const scorecard_service_1 = require("../recruitment/interviews/scorecard.service");
const email_templates_service_1 = require("../recruitment/interviews/email-templates.service");
const applicationForm_service_1 = require("../recruitment/jobs/applicationForm.service");
const seeder_service_1 = require("../lifecycle/onboarding/seeder.service");
const deductions_service_1 = require("../payroll/deductions/deductions.service");
const holidays_service_1 = require("../leave/holidays/holidays.service");
const competency_service_1 = require("../performance/templates/seed/competency.service");
const questions_service_1 = require("../performance/templates/seed/questions.service");
let SeedService = class SeedService {
    constructor(permissions, onboarding, pipeline, offerLetter, scoreCard, emailTemplate, applicationForm, deductionType, holidays, performanceCompetencyService, performanceReviewQuestionService) {
        this.permissions = permissions;
        this.onboarding = onboarding;
        this.pipeline = pipeline;
        this.offerLetter = offerLetter;
        this.scoreCard = scoreCard;
        this.emailTemplate = emailTemplate;
        this.applicationForm = applicationForm;
        this.deductionType = deductionType;
        this.holidays = holidays;
        this.performanceCompetencyService = performanceCompetencyService;
        this.performanceReviewQuestionService = performanceReviewQuestionService;
    }
    async seedDatabase() {
        await Promise.all([
            this.permissions.create(),
            this.onboarding.seedAllGlobalTemplates(),
            this.pipeline.seedAllTemplates(),
            this.offerLetter.seedSystemOfferLetterTemplates(),
            this.scoreCard.seedSystemTemplates(),
            this.emailTemplate.seedSystemEmailTemplates(),
            this.applicationForm.seedDefaultFields(),
            this.holidays.insertHolidaysForCurrentYear('NG'),
        ]);
        await this.seedDeductionTypes();
        await this.performanceCompetencyService.seedGlobalCompetencies();
        await this.performanceCompetencyService.seedSystemLevels();
        await this.performanceReviewQuestionService.seedGlobalReviewQuestions();
        return { message: 'Database seeding completed successfully.' };
    }
    async seedDeductionTypes() {
        const deductionTypeSeedData = [
            {
                name: 'Union Dues',
                code: 'UNION_DUES',
                systemDefined: true,
                requiresMembership: true,
            },
            {
                name: 'Corporate Society',
                code: 'CORP_SOC',
                systemDefined: true,
                requiresMembership: true,
            },
            {
                name: 'Loan Repayment',
                code: 'LOAN_REPAY',
                systemDefined: false,
                requiresMembership: false,
            },
            {
                name: 'Welfare Contribution',
                code: 'WELFARE_CONTRIB',
                systemDefined: false,
                requiresMembership: true,
            },
        ];
        for (const dto of deductionTypeSeedData) {
            await this.deductionType.createDeductionType(dto);
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService,
        seeder_service_1.OnboardingSeederService,
        pipeline_seeder_service_1.PipelineSeederService,
        offer_letter_service_1.OfferLetterService,
        scorecard_service_1.ScorecardTemplateService,
        email_templates_service_1.InterviewEmailTemplateService,
        applicationForm_service_1.ApplicationFormService,
        deductions_service_1.DeductionsService,
        holidays_service_1.HolidaysService,
        competency_service_1.PerformanceCompetencyService,
        questions_service_1.PerformanceReviewQuestionService])
], SeedService);
//# sourceMappingURL=seeder.service.js.map