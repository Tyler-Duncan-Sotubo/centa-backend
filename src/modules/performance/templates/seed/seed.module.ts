import { Module } from '@nestjs/common';
import { SeedController } from './seed.controller';
import { PerformanceCompetencyService } from './competency.service';
import { PerformanceReviewQuestionService } from './questions.service';
import { RoleCompetencyExpectationService } from './role-competency.service';

@Module({
  controllers: [SeedController],
  providers: [
    PerformanceReviewQuestionService,
    PerformanceCompetencyService,
    RoleCompetencyExpectationService,
  ],
})
export class SeedModule {}
