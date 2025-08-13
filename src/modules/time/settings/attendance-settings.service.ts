import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class AttendanceSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // 1 hour cache
  private tags(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:attendance`,
    ];
  }

  /**
   * Get all attendance.* settings as a flat object (prefix stripped).
   * Cached under company:{id}:v{ver}:attendance:all
   */
  async getAllAttendanceSettings(
    companyId: string,
  ): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['attendance', 'all'],
      async () => {
        const settings =
          await this.companySettingsService.getAllSettings(companyId);
        const attendanceSettings: Record<string, any> = {};
        for (const setting of settings) {
          if (setting.key.startsWith('attendance.')) {
            const strippedKey = setting.key.replace('attendance.', '');
            attendanceSettings[strippedKey] = setting.value;
          }
        }
        return attendanceSettings;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Structured attendance configuration.
   * Cached under company:{id}:v{ver}:attendance:config
   */
  async getAttendanceSettings(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'config'],
      async () => {
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
          defaultWorkingDays:
            Number(rows['attendance.default_working_days']) || 5,
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  /**
   * Update a single attendance.* setting.
   * Version bump happens in CompanySettingsService.setSetting -> cached reads auto-invalidate.
   */
  async updateAttendanceSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `attendance.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
