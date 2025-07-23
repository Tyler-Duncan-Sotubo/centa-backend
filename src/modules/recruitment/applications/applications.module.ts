import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ResumeScoringService } from './resume-scoring.service';
import { BullModule } from '@nestjs/bullmq';
import { ResumeScoringProcessor } from './resume-scoring.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'resumeScoringQueue',
    }),
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ResumeScoringService,
    ResumeScoringProcessor,
  ],
})
export class ApplicationsModule {}
