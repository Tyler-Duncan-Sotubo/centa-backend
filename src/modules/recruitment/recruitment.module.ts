import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { InterviewsModule } from './interviews/interviews.module';
import { OffersModule } from './offers/offers.module';
import { ApplicationsModule } from './applications/applications.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { PipelineSeederService } from './pipeline/pipeline-seeder.service';

@Module({
  providers: [PipelineSeederService],
  imports: [
    JobsModule,
    CandidatesModule,
    InterviewsModule,
    OffersModule,
    ApplicationsModule,
    PipelineModule,
  ],
  exports: [
    JobsModule,
    CandidatesModule,
    InterviewsModule,
    OffersModule,
    ApplicationsModule,
    PipelineModule,
    PipelineSeederService,
  ],
})
export class RecruitmentModule {}
