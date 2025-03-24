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
exports.PayGroupService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const onboarding_service_1 = require("../../organization/services/onboarding.service");
let PayGroupService = class PayGroupService {
    constructor(db, onboardingService) {
        this.db = db;
        this.onboardingService = onboardingService;
    }
    async getEmployeeById(employee_id) {
        const result = await this.db
            .select({
            id: employee_schema_1.employees.id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Employee not found, please provide a valid employee id');
        }
        return result[0];
    }
    async getEmployeeGroups(company_id) {
        const result = await this.db
            .select({
            id: payroll_schema_1.payGroups.id,
            name: payroll_schema_1.payGroups.name,
            pay_schedule_id: payroll_schema_1.payGroups.pay_schedule_id,
            apply_nhf: payroll_schema_1.payGroups.apply_nhf,
            apply_pension: payroll_schema_1.payGroups.apply_pension,
            apply_paye: payroll_schema_1.payGroups.apply_paye,
            apply_additional: payroll_schema_1.payGroups.apply_additional,
            payFrequency: company_schema_1.paySchedules.payFrequency,
            createdAt: payroll_schema_1.payGroups.createdAt,
        })
            .from(payroll_schema_1.payGroups)
            .innerJoin(company_schema_1.paySchedules, (0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.pay_schedule_id, company_schema_1.paySchedules.id))
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.company_id, company_id))
            .execute();
        return result;
    }
    async createEmployeeGroup(company_id, dto) {
        console.log(dto);
        const result = await this.db
            .insert(payroll_schema_1.payGroups)
            .values({
            ...dto,
            name: dto.name.toLowerCase(),
            company_id: company_id,
        })
            .returning()
            .execute();
        if (dto.employees && dto.employees.length > 0) {
            await this.addEmployeesToGroup(dto.employees, result[0].id);
        }
        await this.onboardingService.completeTask(company_id, 'setupPayGroups');
        return result[0];
    }
    async getEmployeeGroup(group_id) {
        const result = await this.db
            .select()
            .from(payroll_schema_1.payGroups)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.id, group_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Employee group not found, please provide a valid group id');
        }
        return result[0];
    }
    async updateEmployeeGroup(group_id, dto) {
        await this.getEmployeeGroup(group_id);
        await this.db
            .update(payroll_schema_1.payGroups)
            .set({
            ...dto,
        })
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.id, group_id))
            .execute();
        return 'Employee group updated successfully';
    }
    async deleteEmployeeGroup(group_id) {
        const result = await this.db
            .select({
            id: employee_schema_1.employees.id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.group_id, group_id))
            .execute();
        await this.removeEmployeesFromGroup(result.map((employee) => employee.id));
        await this.db.delete(payroll_schema_1.payGroups).where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.id, group_id)).execute();
        return { message: 'Employee group deleted successfully' };
    }
    async getEmployeesInGroup(group_id) {
        const result = await this.db
            .select({
            id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.group_id, group_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('No employees found in this group');
        }
        return result;
    }
    async addEmployeesToGroup(employee_ids, group_id) {
        const employeeIdArray = Array.isArray(employee_ids)
            ? employee_ids
            : [employee_ids];
        for (const employee_id of employeeIdArray) {
            await this.getEmployeeById(employee_id);
        }
        const updatePromises = employeeIdArray.map((employee_id) => this.db
            .update(employee_schema_1.employees)
            .set({ group_id: group_id })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute());
        await Promise.all(updatePromises);
        return `${employeeIdArray.length} employees added to group ${group_id} successfully`;
    }
    async removeEmployeesFromGroup(employee_ids) {
        const employeeIdArray = Array.isArray(employee_ids)
            ? employee_ids
            : [employee_ids];
        for (const employee_id of employeeIdArray) {
            await this.getEmployeeById(employee_id);
        }
        const updatePromises = employeeIdArray.map((employee_id) => this.db
            .update(employee_schema_1.employees)
            .set({ group_id: null })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute());
        await Promise.all(updatePromises);
        return `${employeeIdArray.length} employees removed from the group successfully`;
    }
};
exports.PayGroupService = PayGroupService;
exports.PayGroupService = PayGroupService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, onboarding_service_1.OnboardingService])
], PayGroupService);
//# sourceMappingURL=pay-group.service.js.map