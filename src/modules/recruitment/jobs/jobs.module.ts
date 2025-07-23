import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PipelineSeederService } from '../pipeline/pipeline-seeder.service';
import { ApplicationFormService } from './applicationForm.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, PipelineSeederService, ApplicationFormService],
})
export class JobsModule {}
