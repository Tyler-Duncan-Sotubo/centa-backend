"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeModule = void 0;
const common_1 = require("@nestjs/common");
const shifts_module_1 = require("./shifts/shifts.module");
const employee_shifts_module_1 = require("./employee-shifts/employee-shifts.module");
const clock_in_out_module_1 = require("./clock-in-out/clock-in-out.module");
const report_module_1 = require("./report/report.module");
const attendance_settings_module_1 = require("./settings/attendance-settings.module");
let TimeModule = class TimeModule {
};
exports.TimeModule = TimeModule;
exports.TimeModule = TimeModule = __decorate([
    (0, common_1.Module)({
        controllers: [],
        providers: [],
        imports: [
            shifts_module_1.ShiftsModule,
            employee_shifts_module_1.EmployeeShiftsModule,
            clock_in_out_module_1.ClockInOutModule,
            report_module_1.ReportModule,
            attendance_settings_module_1.AttendanceSettingsModule,
        ],
        exports: [shifts_module_1.ShiftsModule, employee_shifts_module_1.EmployeeShiftsModule, clock_in_out_module_1.ClockInOutModule, report_module_1.ReportModule],
    })
], TimeModule);
//# sourceMappingURL=time.module.js.map