import { Injectable, BadRequestException } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AttendanceSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  // ---------- cache keys
  private allKey(companyId: string) {
    return `company:${companyId}:attendance:settings:all`;
  }
  private normalizedKey(companyId: string) {
    return `company:${companyId}:attendance:settings:normalized`;
  }
  private async invalidate(companyId: string) {
    await Promise.allSettled([
      this.cache.del(this.allKey(companyId)),
      this.cache.del(this.normalizedKey(companyId)),
    ]);
  }

  async getAllAttendanceSettings(
    companyId: string,
  ): Promise<Record<string, any>> {
    return this.cache.getOrSetCache(
      this.allKey(companyId),
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
      // { ttl: 300 }
    );
  }

  async getAttendanceSettings(companyId: string) {
    return this.cache.getOrSetCache(
      this.normalizedKey(companyId),
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

        // Helpers to coerce values safely (rows may store strings)
        const toBool = (v: any) => {
          if (typeof v === 'boolean') return v;
          if (v === 'true' || v === '1' || v === 1) return true;
          if (v === 'false' || v === '0' || v === 0) return false;
          return Boolean(v); // fallback
        };
        const toNum = (v: any, dflt: number) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : dflt;
        };

        return {
          useShifts: toBool(rows['attendance.use_shifts']),
          defaultStartTime: rows['attendance.default_start_time'] ?? '09:00',
          defaultEndTime: rows['attendance.default_end_time'] ?? '17:00',
          defaultWorkingDays: toNum(rows['attendance.default_working_days'], 5),
          lateToleranceMinutes: toNum(
            rows['attendance.late_tolerance_minutes'],
            10,
          ),
          earlyClockInWindowMinutes: toNum(
            rows['attendance.early_clock_in_window_minutes'],
            15,
          ),
          blockOnHoliday: toBool(rows['attendance.block_on_holiday']),
          allowOvertime: toBool(rows['attendance.allow_overtime']),
          overtimeRate: toNum(rows['attendance.overtime_rate'], 1.5),
          allowHalfDay: toBool(rows['attendance.allow_half_day']),
          halfDayDuration: toNum(rows['attendance.half_day_duration'], 4),
        };
      },
      // { ttl: 120 }
    );
  }

  async updateAttendanceSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    if (!key?.trim()) {
      throw new BadRequestException('Key is required');
    }
    const settingKey = `attendance.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);

    // 🔥 burst both caches
    await this.invalidate(companyId);
  }
}
