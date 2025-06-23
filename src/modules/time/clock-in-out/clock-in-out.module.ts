import { Module } from '@nestjs/common';
import { ClockInOutService } from './clock-in-out.service';
import { ClockInOutController } from './clock-in-out.controller';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { ReportService } from '../report/report.service';

@Module({
  controllers: [ClockInOutController],
  providers: [
    ClockInOutService,
    AttendanceSettingsService,
    EmployeeShiftsService,
    ReportService,
  ],
})
export class ClockInOutModule {}
