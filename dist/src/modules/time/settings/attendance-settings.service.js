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
let AttendanceSettingsService = class AttendanceSettingsService {
    constructor(companySettingsService) {
        this.companySettingsService = companySettingsService;
    }
    tags(companyId) {
        return [
            `company:${companyId}:settings`,
            `company:${companyId}:settings:group:attendance`,
        ];
    }
    async getAllAttendanceSettings(companyId) {
        const settings = await this.companySettingsService.getAllSettings(companyId);
        const attendanceSettings = {};
        for (const setting of settings) {
            if (setting.key.startsWith('attendance.')) {
                const strippedKey = setting.key.replace('attendance.', '');
                attendanceSettings[strippedKey] = setting.value;
            }
        }
        return attendanceSettings;
    }
    async getAttendanceSettings(companyId) {
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
        return {
            useShifts: Boolean(rows['attendance.use_shifts']),
            defaultStartTime: rows['attendance.default_start_time'] ?? '09:00',
            defaultEndTime: rows['attendance.default_end_time'] ?? '17:00',
            defaultWorkingDays: Number(rows['attendance.default_working_days']) || 5,
            lateToleranceMinutes: Number(rows['attendance.late_tolerance_minutes']) || 10,
            earlyClockInWindowMinutes: Number(rows['attendance.early_clock_in_window_minutes']) || 15,
            blockOnHoliday: Boolean(rows['attendance.block_on_holiday']),
            allowOvertime: Boolean(rows['attendance.allow_overtime']),
            overtimeRate: Number(rows['attendance.overtime_rate']) || 1.5,
            allowHalfDay: Boolean(rows['attendance.allow_half_day']),
            halfDayDuration: Number(rows['attendance.half_day_duration']) || 4,
        };
    }
    async updateAttendanceSetting(companyId, key, value) {
        const settingKey = `attendance.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.AttendanceSettingsService = AttendanceSettingsService;
exports.AttendanceSettingsService = AttendanceSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], AttendanceSettingsService);
//# sourceMappingURL=attendance-settings.service.js.map