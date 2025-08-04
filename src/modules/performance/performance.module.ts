import { Module } from '@nestjs/common';
import { PerformanceSettingsModule } from './performance-settings/performance-settings.module';
import { CycleModule } from './cycle/cycle.module';
import { GoalsModule } from './goals/goals.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { TemplatesModule } from './templates/templates.module';
import { CalibrationModule } from './calibration/calibration.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AppraisalsModule } from './appraisals/appraisals.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    PerformanceSettingsModule,
    CycleModule,
    GoalsModule,
    AssessmentsModule,
    TemplatesModule,
    CalibrationModule,
    FeedbackModule,
    AppraisalsModule,
    ReportModule,
  ],
  exports: [
    PerformanceSettingsModule,
    CycleModule,
    GoalsModule,
    AssessmentsModule,
    TemplatesModule,
    CalibrationModule,
  ],
})
export class PerformanceModule {}
