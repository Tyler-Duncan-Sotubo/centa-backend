import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { GenerateReportsService } from './generate-reports.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';

@Module({
  controllers: [ReportController],
  providers: [
    ReportService,
    AttendanceSettingsService,
    EmployeeShiftsService,
    GenerateReportsService,
    S3StorageService,
  ],
  exports: [
    ReportService,
    AttendanceSettingsService,
    EmployeeShiftsService,
    GenerateReportsService,
    S3StorageService,
  ],
})
export class ReportModule {}
