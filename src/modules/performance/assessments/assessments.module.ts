import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AssessmentResponsesController } from './responses/assessment-responses.controller';
import { AssessmentConclusionsController } from './conclusions/assessment-conclusions.controller';
import { AssessmentResponsesService } from './responses/responses.service';
import { AssessmentConclusionsService } from './conclusions/conclusions.service';

@Module({
  controllers: [
    AssessmentsController,
    AssessmentResponsesController,
    AssessmentConclusionsController,
  ],
  providers: [
    AssessmentsService,
    ClockInOutService,
    AssessmentResponsesService,
    AssessmentConclusionsService,
  ],
})
export class AssessmentsModule {}
