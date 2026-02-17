import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AssessmentResponsesController } from './responses/assessment-responses.controller';
import { AssessmentConclusionsController } from './conclusions/assessment-conclusions.controller';
import { AssessmentResponsesService } from './responses/responses.service';
import { AssessmentConclusionsService } from './conclusions/conclusions.service';
import { SelfAssessmentsController } from './self-assessments.controller';
import { SelfAssessmentsService } from './self-assessments.service';

@Module({
  controllers: [
    AssessmentsController,
    AssessmentResponsesController,
    AssessmentConclusionsController,
    SelfAssessmentsController,
  ],
  providers: [
    AssessmentsService,
    ClockInOutService,
    AssessmentResponsesService,
    AssessmentConclusionsService,
    SelfAssessmentsService,
  ],
})
export class AssessmentsModule {}
