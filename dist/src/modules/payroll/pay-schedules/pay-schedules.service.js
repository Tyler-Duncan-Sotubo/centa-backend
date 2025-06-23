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
exports.PaySchedulesService = void 0;
const common_1 = require("@nestjs/common");
const pay_schedules_schema_1 = require("../schema/pay-schedules.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const axios_1 = require("axios");
const date_fns_1 = require("date-fns");
const pay_groups_schema_1 = require("../schema/pay-groups.schema");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PaySchedulesService = class PaySchedulesService {
    constructor(db, auditService, companySettings) {
        this.db = db;
        this.auditService = auditService;
        this.companySettings = companySettings;
    }
    async findOne(scheduleId) {
        const paySchedule = await this.db
            .select()
            .from(pay_schedules_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.id, scheduleId))
            .execute();
        if (paySchedule.length === 0) {
            throw new common_1.BadRequestException('Pay schedule not found');
        }
        return paySchedule[0];
    }
    async getCompanyPaySchedule(companyId) {
        const payFrequency = await this.db
            .select()
            .from(pay_schedules_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, companyId))
            .execute();
        return payFrequency;
    }
    async getNextPayDate(companyId) {
        const paySchedulesData = await this.db
            .select({
            paySchedule: pay_schedules_schema_1.paySchedules.paySchedule,
        })
            .from(pay_schedules_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, companyId))
            .execute();
        if (paySchedulesData.length === 0) {
            throw new common_1.BadRequestException('No pay schedules found for this company');
        }
        const today = new Date();
        const allPayDates = paySchedulesData
            .flatMap((schedule) => schedule.paySchedule)
            .map((date) => new Date(date))
            .filter((date) => date > today)
            .sort((a, b) => a.getTime() - b.getTime());
        return allPayDates.length > 0 ? allPayDates[0] : null;
    }
    async listPaySchedulesForCompany(companyId) {
        const payFrequency = await this.db
            .select({
            payFrequency: pay_schedules_schema_1.paySchedules.payFrequency,
            paySchedules: pay_schedules_schema_1.paySchedules.paySchedule,
            id: pay_schedules_schema_1.paySchedules.id,
        })
            .from(pay_schedules_schema_1.paySchedules)
            .where((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, companyId))
            .execute();
        if (payFrequency.length === 0) {
            throw new common_1.BadRequestException('No pay schedules found for this company');
        }
        return payFrequency;
    }
    async isPublicHoliday(date, countryCode) {
        const formattedDate = date.toISOString().split('T')[0];
        const url = `https://date.nager.at/api/v3/publicholidays/${date.getFullYear()}/${countryCode}`;
        try {
            const response = await axios_1.default.get(url);
            const holidays = response.data;
            return holidays.some((holiday) => holiday.date === formattedDate);
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async adjustForWeekendAndHoliday(date, countryCode) {
        let adjustedDate = new Date(date);
        while ((0, date_fns_1.isSaturday)(adjustedDate) || (0, date_fns_1.isSunday)(adjustedDate)) {
            adjustedDate = (0, date_fns_1.addDays)(adjustedDate, -1);
        }
        while (await this.isPublicHoliday(adjustedDate, countryCode)) {
            adjustedDate = (0, date_fns_1.addDays)(adjustedDate, -1);
        }
        return adjustedDate;
    }
    async generatePaySchedule(startDate, frequency, numPeriods = 6, countryCode) {
        const schedule = [];
        for (let i = 0; i < numPeriods; i++) {
            let payDate;
            switch (frequency) {
                case 'weekly':
                    payDate = (0, date_fns_1.addDays)(startDate, i * 7);
                    break;
                case 'biweekly':
                    payDate = (0, date_fns_1.addDays)(startDate, i * 14);
                    break;
                case 'semi-monthly':
                    const firstHalf = (0, date_fns_1.startOfMonth)((0, date_fns_1.addMonths)(startDate, i));
                    const secondHalf = (0, date_fns_1.addDays)(firstHalf, 14);
                    schedule.push(await this.adjustForWeekendAndHoliday(firstHalf, countryCode), await this.adjustForWeekendAndHoliday(secondHalf, countryCode));
                    continue;
                case 'monthly':
                    payDate = (0, date_fns_1.endOfMonth)((0, date_fns_1.addMonths)(startDate, i));
                    break;
                default:
                    throw new Error('Invalid frequency');
            }
            schedule.push(await this.adjustForWeekendAndHoliday(payDate, countryCode));
        }
        return schedule;
    }
    async createPayFrequency(companyId, dto) {
        const schedule = await this.generatePaySchedule(new Date(dto.startDate), dto.payFrequency, 6, dto.countryCode);
        try {
            const paySchedule = await this.db
                .insert(pay_schedules_schema_1.paySchedules)
                .values({
                companyId: companyId,
                payFrequency: dto.payFrequency,
                paySchedule: schedule,
                startDate: dto.startDate,
                weekendAdjustment: dto.weekendAdjustment,
                holidayAdjustment: dto.holidayAdjustment,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning()
                .execute();
            await this.companySettings.setSetting(companyId, 'onboarding_pay_frequency', true);
            return paySchedule;
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async updatePayFrequency(user, dto, payFrequencyId) {
        const schedule = await this.generatePaySchedule(new Date(dto.startDate), dto.payFrequency, 6, dto.countryCode);
        try {
            await this.db
                .update(pay_schedules_schema_1.paySchedules)
                .set({
                payFrequency: dto.payFrequency,
                paySchedule: schedule,
                startDate: dto.startDate,
                weekendAdjustment: dto.weekendAdjustment,
                holidayAdjustment: dto.holidayAdjustment,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, user.companyId), (0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.id, payFrequencyId)))
                .execute();
            await this.auditService.logAction({
                action: 'update',
                entity: 'pay_schedule',
                entityId: payFrequencyId,
                userId: user.id,
                details: 'Pay schedule updated',
                changes: {
                    payFrequency: dto.payFrequency,
                    paySchedule: schedule,
                    startDate: dto.startDate,
                    weekendAdjustment: dto.weekendAdjustment,
                    holidayAdjustment: dto.holidayAdjustment,
                },
            });
            return 'Pay frequency updated successfully';
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async deletePaySchedule(scheduleId, user, ip) {
        await this.findOne(scheduleId);
        const payGroup = await this.db
            .select()
            .from(pay_groups_schema_1.payGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.companyId, user.companyId), (0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.payScheduleId, scheduleId)))
            .execute();
        if (payGroup.length > 0) {
            throw new common_1.BadRequestException('Cannot delete pay schedule. Pay group is using this pay schedule');
        }
        await this.db
            .update(pay_schedules_schema_1.paySchedules)
            .set({
            isDeleted: true,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.companyId, user.companyId), (0, drizzle_orm_1.eq)(pay_schedules_schema_1.paySchedules.id, scheduleId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'pay_schedule',
            entityId: scheduleId,
            userId: user.id,
            details: 'Pay schedule deleted',
            ipAddress: ip,
        });
        return 'Pay frequency deleted successfully';
    }
};
exports.PaySchedulesService = PaySchedulesService;
exports.PaySchedulesService = PaySchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], PaySchedulesService);
//# sourceMappingURL=pay-schedules.service.js.map