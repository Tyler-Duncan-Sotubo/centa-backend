import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { PipelineSeederService } from '../recruitment/pipeline/pipeline-seeder.service';
import { OfferLetterService } from '../recruitment/offers/offer-letter/offer-letter.service';
import { ScorecardTemplateService } from '../recruitment/interviews/scorecard.service';
import { InterviewEmailTemplateService } from '../recruitment/interviews/email-templates.service';
import { ApplicationFormService } from '../recruitment/jobs/applicationForm.service';
import { OnboardingSeederService } from '../lifecycle/onboarding/seeder.service';
import { DeductionsService } from '../payroll/deductions/deductions.service';
import { HolidaysService } from '../leave/holidays/holidays.service';
import { PerformanceCompetencyService } from '../performance/templates/seed/competency.service';
import { PerformanceReviewQuestionService } from '../performance/templates/seed/questions.service';
import { OffboardingSeederService } from '../lifecycle/offboarding/offboarding-seeder.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly permissions: PermissionsService,
    private readonly onboarding: OnboardingSeederService,
    private readonly pipeline: PipelineSeederService,
    private readonly offerLetter: OfferLetterService,
    private readonly scoreCard: ScorecardTemplateService,
    private readonly emailTemplate: InterviewEmailTemplateService,
    private readonly applicationForm: ApplicationFormService,
    private readonly deductionType: DeductionsService,
    private readonly holidays: HolidaysService,
    private readonly performanceCompetencyService: PerformanceCompetencyService,
    private readonly performanceReviewQuestionService: PerformanceReviewQuestionService,
    private readonly offboarding: OffboardingSeederService,
  ) {}

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
      this.offboarding.seedGlobalOffboardingData(),
    ]);

    await this.seedDeductionTypes();
    await this.performanceCompetencyService.seedGlobalCompetencies();
    await this.performanceCompetencyService.seedSystemLevels();
    await this.performanceReviewQuestionService.seedGlobalReviewQuestions();

    return { message: 'Database seeding completed successfully.' };
  }

  private async seedDeductionTypes() {
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
}
