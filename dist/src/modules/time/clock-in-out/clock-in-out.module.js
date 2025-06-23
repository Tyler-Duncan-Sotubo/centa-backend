"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClockInOutModule = void 0;
const common_1 = require("@nestjs/common");
const clock_in_out_service_1 = require("./clock-in-out.service");
const clock_in_out_controller_1 = require("./clock-in-out.controller");
const attendance_settings_service_1 = require("../settings/attendance-settings.service");
const employee_shifts_service_1 = require("../employee-shifts/employee-shifts.service");
const report_service_1 = require("../report/report.service");
let ClockInOutModule = class ClockInOutModule {
};
exports.ClockInOutModule = ClockInOutModule;
exports.ClockInOutModule = ClockInOutModule = __decorate([
    (0, common_1.Module)({
        controllers: [clock_in_out_controller_1.ClockInOutController],
        providers: [
            clock_in_out_service_1.ClockInOutService,
            attendance_settings_service_1.AttendanceSettingsService,
            employee_shifts_service_1.EmployeeShiftsService,
            report_service_1.ReportService,
        ],
    })
], ClockInOutModule);
//# sourceMappingURL=clock-in-out.module.js.map