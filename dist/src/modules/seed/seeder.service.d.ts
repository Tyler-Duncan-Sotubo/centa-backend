import { PermissionsService } from '../auth/permissions/permissions.service';
import { PipelineSeederService } from '../recruitment/pipeline/pipeline-seeder.service';
import { OfferLetterService } from '../recruitment/offers/offer-letter/offer-letter.service';
import { ScorecardTemplateService } from '../recruitment/interviews/scorecard.service';
import { InterviewEmailTemplateService } from '../recruitment/interviews/email-templates.service';
import { ApplicationFormService } from '../recruitment/jobs/applicationForm.service';
import { OnboardingSeederService } from '../lifecycle/onboarding/seeder.service';
import { DeductionsService } from '../payroll/deductions/deductions.service';
import { HolidaysService } from '../leave/holidays/holidays.service';
export declare class SeedService {
    private readonly permissions;
    private readonly onboarding;
    private readonly pipeline;
    private readonly offerLetter;
    private readonly scoreCard;
    private readonly emailTemplate;
    private readonly applicationForm;
    private readonly deductionType;
    private readonly holidays;
    constructor(permissions: PermissionsService, onboarding: OnboardingSeederService, pipeline: PipelineSeederService, offerLetter: OfferLetterService, scoreCard: ScorecardTemplateService, emailTemplate: InterviewEmailTemplateService, applicationForm: ApplicationFormService, deductionType: DeductionsService, holidays: HolidaysService);
    seedDatabase(): Promise<{
        message: string;
    }>;
    private seedDeductionTypes;
}
