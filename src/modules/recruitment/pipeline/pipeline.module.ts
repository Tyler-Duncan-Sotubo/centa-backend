import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';
import { PipelineSeederService } from './pipeline-seeder.service';

@Module({
  controllers: [PipelineController],
  providers: [PipelineService, PipelineSeederService],
})
export class PipelineModule {}
