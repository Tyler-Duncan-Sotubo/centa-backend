import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { RunService } from '../run/run.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { GenerateReportService } from './generate-report.service';
import { BullModule } from '@nestjs/bullmq';
import { SalaryAdvanceService } from '../salary-advance/salary-advance.service';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    RunService,
    S3StorageService,
    GenerateReportService,
    SalaryAdvanceService,
  ],
  exports: [ReportService],
  imports: [
    // Add any necessary imports here, such as BullModule for queues
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
  ],
})
export class ReportModule {}
