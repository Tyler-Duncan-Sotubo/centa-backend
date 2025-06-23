"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportModule = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const report_controller_1 = require("./report.controller");
const attendance_settings_service_1 = require("../settings/attendance-settings.service");
const employee_shifts_service_1 = require("../employee-shifts/employee-shifts.service");
const generate_reports_service_1 = require("./generate-reports.service");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
let ReportModule = class ReportModule {
};
exports.ReportModule = ReportModule;
exports.ReportModule = ReportModule = __decorate([
    (0, common_1.Module)({
        controllers: [report_controller_1.ReportController],
        providers: [
            report_service_1.ReportService,
            attendance_settings_service_1.AttendanceSettingsService,
            employee_shifts_service_1.EmployeeShiftsService,
            generate_reports_service_1.GenerateReportsService,
            s3_storage_service_1.S3StorageService,
        ],
        exports: [
            report_service_1.ReportService,
            attendance_settings_service_1.AttendanceSettingsService,
            employee_shifts_service_1.EmployeeShiftsService,
            generate_reports_service_1.GenerateReportsService,
            s3_storage_service_1.S3StorageService,
        ],
    })
], ReportModule);
//# sourceMappingURL=report.module.js.map