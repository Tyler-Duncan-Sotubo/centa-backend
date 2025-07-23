import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { ScorecardTemplateService } from './scorecard.service';
import { InterviewEmailTemplateService } from './email-templates.service';

@Module({
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    ScorecardTemplateService,
    InterviewEmailTemplateService,
  ],
})
export class InterviewsModule {}
