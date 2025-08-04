import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PerformanceExportService } from './csv-performance-export.service';
import { PerformancePdfExportService } from './performance-pdf-export.service';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    PerformanceExportService,
    PerformancePdfExportService,
  ],
})
export class ReportModule {}
