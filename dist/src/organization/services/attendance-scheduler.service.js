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
var AttendanceSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const attendance_service_1 = require("./attendance.service");
let AttendanceSchedulerService = AttendanceSchedulerService_1 = class AttendanceSchedulerService {
    constructor(attendanceService, db) {
        this.attendanceService = attendanceService;
        this.db = db;
        this.logger = new common_1.Logger(AttendanceSchedulerService_1.name);
    }
    async handleDailyAttendanceSummary() {
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        if (isWeekend) {
            this.logger.log('Skipping attendance summary on weekend.');
            return;
        }
        const allCompanies = await this.db.select().from(company_schema_1.companies);
        for (const company of allCompanies) {
            const companyId = company.id;
            try {
                this.logger.log(`Generating attendance summary for company ${companyId}`);
                await this.attendanceService.saveDailyAttendanceSummary(companyId);
            }
            catch (err) {
                this.logger.error(`Failed to generate summary for company ${companyId}`, err.stack);
            }
        }
    }
};
exports.AttendanceSchedulerService = AttendanceSchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_11PM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceSchedulerService.prototype, "handleDailyAttendanceSummary", null);
exports.AttendanceSchedulerService = AttendanceSchedulerService = AttendanceSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService, Object])
], AttendanceSchedulerService);
//# sourceMappingURL=attendance-scheduler.service.js.map