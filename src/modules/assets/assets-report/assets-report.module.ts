import { Module } from '@nestjs/common';
import { AssetsReportService } from './assets-report.service';
import { AssetsReportController } from './assets-report.controller';

@Module({
  controllers: [AssetsReportController],
  providers: [AssetsReportService],
})
export class AssetsReportModule {}
