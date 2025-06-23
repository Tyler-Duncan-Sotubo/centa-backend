import { Module } from '@nestjs/common';
import { ShiftsModule } from './shifts/shifts.module';
import { EmployeeShiftsModule } from './employee-shifts/employee-shifts.module';
import { ClockInOutModule } from './clock-in-out/clock-in-out.module';
import { ReportModule } from './report/report.module';
import { AttendanceSettingsModule } from './settings/attendance-settings.module';

@Module({
  controllers: [],
  providers: [],
  imports: [
    ShiftsModule,
    EmployeeShiftsModule,
    ClockInOutModule,
    ReportModule,
    AttendanceSettingsModule,
  ],
  exports: [ShiftsModule, EmployeeShiftsModule, ClockInOutModule, ReportModule],
})
export class TimeModule {}
