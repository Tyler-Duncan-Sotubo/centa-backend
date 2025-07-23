import { Module } from '@nestjs/common';
import { SeedController } from './seeder.controller';
import { SeedService } from './seeder.service';
import { OnboardingSeederService } from '../lifecycle/onboarding/seeder.service';
import { OfferLetterService } from '../recruitment/offers/offer-letter/offer-letter.service';
import { ScorecardTemplateService } from '../recruitment/interviews/scorecard.service';
import { InterviewEmailTemplateService } from '../recruitment/interviews/email-templates.service';
import { ApplicationFormService } from '../recruitment/jobs/applicationForm.service';

@Module({
  controllers: [SeedController],
  providers: [
    SeedService,
    OnboardingSeederService,
    OfferLetterService,
    ScorecardTemplateService,
    InterviewEmailTemplateService,
    ApplicationFormService,
  ],
})
export class SeederModule {}
