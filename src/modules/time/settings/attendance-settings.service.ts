import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class AttendanceSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async getAllAttendanceSettings(
    companyId: string,
  ): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);

    const attendanceSettings = {};

    for (const setting of settings) {
      if (setting.key.startsWith('attendance.')) {
        const strippedKey = setting.key.replace('attendance.', '');
        attendanceSettings[strippedKey] = setting.value;
      }
    }

    return attendanceSettings;
  }

  async getAttendanceSettings(companyId: string) {
    const keys = [
      'attendance.use_shifts',
      'attendance.default_start_time',
      'attendance.default_end_time',
      'attendance.default_working_days',
      'attendance.late_tolerance_minutes',
      'attendance.early_clock_in_window_minutes',
      'attendance.block_on_holiday',
      'attendance.allow_overtime',
      'attendance.overtime_rate',
      'attendance.allow_half_day',
      'attendance.half_day_duration',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    return {
      useShifts: Boolean(rows['attendance.use_shifts']),
      defaultStartTime: rows['attendance.default_start_time'] ?? '09:00',
      defaultEndTime: rows['attendance.default_end_time'] ?? '17:00',
      defaultWorkingDays: Number(rows['attendance.default_working_days']) || 5,
      lateToleranceMinutes:
        Number(rows['attendance.late_tolerance_minutes']) || 10,
      earlyClockInWindowMinutes:
        Number(rows['attendance.early_clock_in_window_minutes']) || 15,
      blockOnHoliday: Boolean(rows['attendance.block_on_holiday']),
      allowOvertime: Boolean(rows['attendance.allow_overtime']),
      overtimeRate: Number(rows['attendance.overtime_rate']) || 1.5,
      allowHalfDay: Boolean(rows['attendance.allow_half_day']),
      halfDayDuration: Number(rows['attendance.half_day_duration']) || 4,
    };
  }

  async updateAttendanceSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `attendance.${key}`;

    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
