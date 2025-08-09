"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSettingsService = void 0;
const common_1 = require("@nestjs/common");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let AttendanceSettingsService = class AttendanceSettingsService {
    constructor(companySettingsService, cache) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
    }
    allKey(companyId) {
        return `company:${companyId}:attendance:settings:all`;
    }
    normalizedKey(companyId) {
        return `company:${companyId}:attendance:settings:normalized`;
    }
    async invalidate(companyId) {
        await Promise.allSettled([
            this.cache.del(this.allKey(companyId)),
            this.cache.del(this.normalizedKey(companyId)),
        ]);
    }
    async getAllAttendanceSettings(companyId) {
        return this.cache.getOrSetCache(this.allKey(companyId), async () => {
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const attendanceSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('attendance.')) {
                    const strippedKey = setting.key.replace('attendance.', '');
                    attendanceSettings[strippedKey] = setting.value;
                }
            }
            return attendanceSettings;
        });
    }
    async getAttendanceSettings(companyId) {
        return this.cache.getOrSetCache(this.normalizedKey(companyId), async () => {
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
            const rows = await this.companySettingsService.fetchSettings(companyId, keys);
            const toBool = (v) => {
                if (typeof v === 'boolean')
                    return v;
                if (v === 'true' || v === '1' || v === 1)
                    return true;
                if (v === 'false' || v === '0' || v === 0)
                    return false;
                return Boolean(v);
            };
            const toNum = (v, dflt) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : dflt;
            };
            return {
                useShifts: toBool(rows['attendance.use_shifts']),
                defaultStartTime: rows['attendance.default_start_time'] ?? '09:00',
                defaultEndTime: rows['attendance.default_end_time'] ?? '17:00',
                defaultWorkingDays: toNum(rows['attendance.default_working_days'], 5),
                lateToleranceMinutes: toNum(rows['attendance.late_tolerance_minutes'], 10),
                earlyClockInWindowMinutes: toNum(rows['attendance.early_clock_in_window_minutes'], 15),
                blockOnHoliday: toBool(rows['attendance.block_on_holiday']),
                allowOvertime: toBool(rows['attendance.allow_overtime']),
                overtimeRate: toNum(rows['attendance.overtime_rate'], 1.5),
                allowHalfDay: toBool(rows['attendance.allow_half_day']),
                halfDayDuration: toNum(rows['attendance.half_day_duration'], 4),
            };
        });
    }
    async updateAttendanceSetting(companyId, key, value) {
        if (!key?.trim()) {
            throw new common_1.BadRequestException('Key is required');
        }
        const settingKey = `attendance.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
        await this.invalidate(companyId);
    }
};
exports.AttendanceSettingsService = AttendanceSettingsService;
exports.AttendanceSettingsService = AttendanceSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], AttendanceSettingsService);
//# sourceMappingURL=attendance-settings.service.js.map