"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistModule = void 0;
const common_1 = require("@nestjs/common");
const checklist_service_1 = require("./checklist.service");
const checklist_controller_1 = require("./checklist.controller");
const staff_checklist_service_1 = require("./services/staff-checklist.service");
const payroll_checklist_service_1 = require("./services/payroll-checklist.service");
const performance_checklist_service_1 = require("./services/performance-checklist.service");
const hiring_checklist_service_1 = require("./services/hiring-checklist.service");
const attendance_checklist_service_1 = require("./services/attendance-checklist.service");
const leave_checklist_service_1 = require("./services/leave-checklist.service");
let ChecklistModule = class ChecklistModule {
};
exports.ChecklistModule = ChecklistModule;
exports.ChecklistModule = ChecklistModule = __decorate([
    (0, common_1.Module)({
        controllers: [checklist_controller_1.ChecklistController],
        providers: [
            checklist_service_1.ChecklistService,
            staff_checklist_service_1.StaffChecklistService,
            payroll_checklist_service_1.PayrollChecklistService,
            performance_checklist_service_1.PerformanceChecklistService,
            hiring_checklist_service_1.HiringChecklistService,
            attendance_checklist_service_1.AttendanceChecklistService,
            leave_checklist_service_1.LeaveChecklistService,
        ],
        exports: [
            checklist_service_1.ChecklistService,
            staff_checklist_service_1.StaffChecklistService,
            payroll_checklist_service_1.PayrollChecklistService,
            performance_checklist_service_1.PerformanceChecklistService,
            hiring_checklist_service_1.HiringChecklistService,
            attendance_checklist_service_1.AttendanceChecklistService,
            leave_checklist_service_1.LeaveChecklistService,
        ],
    })
], ChecklistModule);
//# sourceMappingURL=checklist.module.js.map