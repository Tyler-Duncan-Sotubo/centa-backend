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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSettingsController = void 0;
const common_1 = require("@nestjs/common");
const attendance_settings_service_1 = require("./attendance-settings.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let AttendanceSettingsController = class AttendanceSettingsController extends base_controller_1.BaseController {
    constructor(attendanceSettingsService) {
        super();
        this.attendanceSettingsService = attendanceSettingsService;
    }
    async getAllAttendanceSettings(user) {
        return this.attendanceSettingsService.getAttendanceSettings(user.companyId);
    }
    async updateAttendanceSettings(user, key, value) {
        return this.attendanceSettingsService.updateAttendanceSetting(user.companyId, key, value);
    }
};
exports.AttendanceSettingsController = AttendanceSettingsController;
__decorate([
    (0, common_1.Get)('options'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AttendanceSettingsController.prototype, "getAllAttendanceSettings", null);
__decorate([
    (0, common_1.Patch)('update'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('key')),
    __param(2, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AttendanceSettingsController.prototype, "updateAttendanceSettings", null);
exports.AttendanceSettingsController = AttendanceSettingsController = __decorate([
    (0, common_1.Controller)('attendance-settings'),
    __metadata("design:paramtypes", [attendance_settings_service_1.AttendanceSettingsService])
], AttendanceSettingsController);
//# sourceMappingURL=attendance-settings.controller.js.map