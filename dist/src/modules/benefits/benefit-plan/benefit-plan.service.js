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
exports.BenefitPlanService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const benefit_plan_schema_1 = require("../schema/benefit-plan.schema");
const benefit_enrollments_schema_1 = require("../schema/benefit-enrollments.schema");
const schema_1 = require("../../../drizzle/schema");
const date_fns_1 = require("date-fns");
const benefit_groups_schema_1 = require("../schema/benefit-groups.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const push_notification_service_1 = require("../../notification/services/push-notification.service");
let BenefitPlanService = class BenefitPlanService {
    constructor(db, auditService, cache, push) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.push = push;
    }
    tags(companyId) {
        return [
            `company:${companyId}:benefits`,
            `company:${companyId}:benefits:plans`,
            `company:${companyId}:benefits:enrollments`,
        ];
    }
    async create(dto, user) {
        const { name, startDate, endDate } = dto;
        const [existingPlan] = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.name, name), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .execute();
        if (existingPlan) {
            throw new common_1.BadRequestException('A benefit plan with this name already exists.');
        }
        if (endDate && new Date(startDate) >= new Date(endDate)) {
            throw new common_1.BadRequestException('The start date must be before the end date.');
        }
        const [newPlan] = await this.db
            .insert(benefit_plan_schema_1.benefitPlans)
            .values({ ...dto, companyId: user.companyId })
            .returning()
            .execute();
        await this.push.createAndSendToCompany(user.companyId, {
            title: 'New Benefit Plan Available',
            body: `A new benefit plan "${newPlan.name}" has been created.`,
            type: 'message',
            data: {
                category: newPlan.category,
            },
            route: `/screens/dashboard/benefits/enroll`,
        });
        await this.auditService.logAction({
            action: 'create',
            entity: 'benefit_plan',
            entityId: newPlan.id,
            userId: user.id,
            details: 'Created a new benefit plan',
            changes: { ...dto, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return newPlan;
    }
    findAll(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['benefits', 'plans', 'all'], () => this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, companyId))
            .execute(), { tags: this.tags(companyId) });
    }
    async findOne(id, companyId) {
        let cid = companyId;
        if (!cid) {
            const [row] = await this.db
                .select({ companyId: benefit_plan_schema_1.benefitPlans.companyId })
                .from(benefit_plan_schema_1.benefitPlans)
                .where((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, id))
                .limit(1)
                .execute();
            cid = row?.companyId;
        }
        if (!cid) {
            throw new common_1.BadRequestException('Benefit plan not found');
        }
        return this.cache.getOrSetVersioned(cid, ['benefits', 'plans', 'one', id], async () => {
            const [benefitPlan] = await this.db
                .select()
                .from(benefit_plan_schema_1.benefitPlans)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, id), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, cid)))
                .execute();
            if (!benefitPlan) {
                throw new common_1.BadRequestException('Benefit plan not found');
            }
            return benefitPlan;
        }, { tags: this.tags(cid) });
    }
    async update(id, dto, user) {
        await this.findOne(id, user.companyId);
        const { startDate, endDate } = dto;
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
            throw new common_1.BadRequestException('The start date must be before the end date.');
        }
        const [updatedPlan] = await this.db
            .update(benefit_plan_schema_1.benefitPlans)
            .set({ ...dto, companyId: user.companyId })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, id), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'benefit_plan',
            entityId: updatedPlan.id,
            userId: user.id,
            details: 'Updated a benefit plan',
            changes: { ...dto, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updatedPlan;
    }
    async remove(id, user) {
        await this.findOne(id, user.companyId);
        const [deletedPlan] = await this.db
            .delete(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, id), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'benefit_plan',
            entityId: deletedPlan.id,
            userId: user.id,
            details: 'Deleted a benefit plan',
            changes: { ...deletedPlan, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
    }
    async findEmployeeById(employeeId, user) {
        const [employee] = await this.db
            .select({
            id: schema_1.employees.id,
            dateOfBirth: schema_1.employeeProfiles.dateOfBirth,
            employmentStartDate: schema_1.employees.employmentStartDate,
            confirmed: schema_1.employees.confirmed,
        })
            .from(schema_1.employees)
            .leftJoin(schema_1.employeeProfiles, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.employeeProfiles.employeeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)))
            .execute();
        if (!employee)
            throw new common_1.BadRequestException('Employee not found');
        return employee;
    }
    async getEmployeeBenefitEnrollments(employeeId, user) {
        await this.findEmployeeById(employeeId, user);
        return this.cache.getOrSetVersioned(user.companyId, ['benefits', 'enrollments', 'employee', employeeId], async () => {
            const enrollments = await this.db
                .select({
                id: benefit_enrollments_schema_1.benefitEnrollments.id,
                employeeId: benefit_enrollments_schema_1.benefitEnrollments.employeeId,
                benefitPlanId: benefit_enrollments_schema_1.benefitEnrollments.benefitPlanId,
                planName: benefit_plan_schema_1.benefitPlans.name,
                category: benefit_plan_schema_1.benefitPlans.category,
                selectedCoverage: benefit_enrollments_schema_1.benefitEnrollments.selectedCoverage,
                monthlyCost: (0, drizzle_orm_1.sql) `(${benefit_plan_schema_1.benefitPlans.cost} ->> ${benefit_enrollments_schema_1.benefitEnrollments.selectedCoverage})`,
                startDate: benefit_plan_schema_1.benefitPlans.startDate,
                endDate: benefit_plan_schema_1.benefitPlans.endDate,
            })
                .from(benefit_enrollments_schema_1.benefitEnrollments)
                .innerJoin(benefit_plan_schema_1.benefitPlans, (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.benefitPlanId, benefit_plan_schema_1.benefitPlans.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.employeeId, employeeId), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId), (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.isOptedOut, false)))
                .execute();
            return enrollments;
        }, { tags: this.tags(user.companyId) });
    }
    async selfEnrollToBenefitPlan(employeeId, dto, user) {
        const [benefitPlan] = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, dto.benefitPlanId), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .execute();
        if (!benefitPlan)
            throw new common_1.BadRequestException('Benefit plan not found');
        const [benefitGroup] = await this.db
            .select()
            .from(benefit_groups_schema_1.benefitGroups)
            .where((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.id, benefitPlan.benefitGroupId))
            .execute();
        if (!benefitGroup)
            throw new common_1.BadRequestException('Benefit group not found');
        if (benefitGroup.teamId) {
            const [team] = await this.db
                .select({
                id: schema_1.groups.id,
                name: schema_1.groups.name,
                companyId: schema_1.groups.companyId,
            })
                .from(schema_1.groups)
                .where((0, drizzle_orm_1.eq)(schema_1.groups.id, benefitGroup.teamId))
                .execute();
            if (!team) {
                throw new common_1.BadRequestException('The team configured for this benefit group no longer exists.');
            }
            if (team.companyId !== user.companyId) {
                throw new common_1.BadRequestException('This benefit group references a team from a different company.');
            }
            const membership = await this.db
                .select({ employeeId: schema_1.groupMemberships.employeeId })
                .from(schema_1.groupMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groupMemberships.groupId, team.id), (0, drizzle_orm_1.eq)(schema_1.groupMemberships.employeeId, employeeId)))
                .limit(1)
                .execute();
            if (!membership.length) {
                throw new common_1.BadRequestException(`You must be a member of the "${team.name}" team to enroll in this benefit plan.`);
            }
        }
        const { minAge, minMonths, onlyConfirmed } = (benefitGroup.rules ?? {});
        const employee = await this.findEmployeeById(employeeId, user);
        const today = new Date();
        const age = (0, date_fns_1.differenceInYears)(today, employee.dateOfBirth || new Date());
        const tenureMonths = (0, date_fns_1.differenceInMonths)(today, employee.employmentStartDate);
        const confirmedOk = !onlyConfirmed || !!employee.confirmed;
        const messages = [];
        if (minAge && age < minAge)
            messages.push(`You need to be at least ${minAge} years old to enroll.`);
        if (minMonths && tenureMonths < minMonths)
            messages.push(`You need to be employed for at least ${minMonths} months before enrolling. You’ve been with the company for ${tenureMonths} months.`);
        if (!confirmedOk)
            messages.push(`Only confirmed employees can enroll in this benefit plan.`);
        if (messages.length)
            throw new common_1.BadRequestException(messages.join(' '));
        const existingEnrollment = await this.db
            .select()
            .from(benefit_enrollments_schema_1.benefitEnrollments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.employeeId, employeeId), (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.benefitPlanId, dto.benefitPlanId), (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.isOptedOut, false)))
            .execute();
        if (existingEnrollment.length) {
            throw new common_1.BadRequestException('You already enrolled in this benefit plan.');
        }
        await this.db
            .insert(benefit_enrollments_schema_1.benefitEnrollments)
            .values({
            employeeId,
            benefitPlanId: dto.benefitPlanId,
            selectedCoverage: dto.selectedCoverage,
        })
            .execute();
        await this.auditService.logAction({
            action: 'enroll',
            entity: 'benefit_enrollment',
            entityId: employeeId,
            userId: user.id,
            details: 'Enrolled an employee to a benefit plan',
            changes: {
                employeeId,
                benefitPlanId: dto.benefitPlanId,
                selectedCoverage: dto.selectedCoverage,
                companyId: user.companyId,
            },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
    }
    async optOutOfBenefitPlan(employeeId, benefitPlanId, user) {
        const [benefitPlan] = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, benefitPlanId), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .execute();
        if (!benefitPlan)
            throw new common_1.BadRequestException('Benefit plan not found');
        await this.findEmployeeById(employeeId, user);
        await this.db
            .update(benefit_enrollments_schema_1.benefitEnrollments)
            .set({ isOptedOut: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.employeeId, employeeId), (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.benefitPlanId, benefitPlanId)))
            .execute();
        await this.auditService.logAction({
            action: 'opt_out',
            entity: 'benefit_enrollment',
            entityId: `${employeeId}`,
            userId: user.id,
            details: 'Employee opted out of a benefit plan',
            changes: { employeeId, benefitPlanId, companyId: user.companyId },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return { message: 'Successfully opted out of the benefit plan.' };
    }
    async enrollEmployeesToBenefitPlan(dto, user) {
        const { employeeIds, benefitPlanId } = dto;
        const [benefitPlan] = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, benefitPlanId), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .execute();
        if (!benefitPlan)
            throw new common_1.BadRequestException('Benefit plan not found');
        for (const employeeId of employeeIds)
            await this.findEmployeeById(employeeId, user);
        await this.db
            .insert(benefit_enrollments_schema_1.benefitEnrollments)
            .values(employeeIds.map((employeeId) => ({
            employeeId,
            benefitPlanId,
            selectedCoverage: dto.selectedCoverage,
        })))
            .execute();
        for (const employeeId of employeeIds) {
            await this.auditService.logAction({
                action: 'enroll',
                entity: 'benefit_enrollment',
                entityId: `${employeeId}-${benefitPlanId}`,
                userId: user.id,
                details: 'Enrolled an employee to a benefit plan',
                changes: { employeeId, benefitPlanId, companyId: user.companyId },
            });
        }
        await this.cache.bumpCompanyVersion(user.companyId);
        return {
            message: `Successfully enrolled ${employeeIds.length} employee(s) to the benefit plan.`,
        };
    }
    async removeEmployeesFromBenefitPlan(dto, user) {
        const { employeeIds, benefitPlanId } = dto;
        const [benefitPlan] = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.id, benefitPlanId), (0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.companyId, user.companyId)))
            .execute();
        if (!benefitPlan)
            throw new common_1.BadRequestException('Benefit plan not found');
        for (const employeeId of employeeIds)
            await this.findEmployeeById(employeeId, user);
        await Promise.all(employeeIds.map((employeeId) => this.db
            .delete(benefit_enrollments_schema_1.benefitEnrollments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.employeeId, employeeId), (0, drizzle_orm_1.eq)(benefit_enrollments_schema_1.benefitEnrollments.benefitPlanId, benefitPlanId)))
            .execute()));
        for (const employeeId of employeeIds) {
            await this.auditService.logAction({
                action: 'remove',
                entity: 'benefit_enrollment',
                entityId: `${employeeId}-${benefitPlanId}`,
                userId: user.id,
                details: 'Removed an employee from a benefit plan',
                changes: { employeeId, benefitPlanId, companyId: user.companyId },
            });
        }
        await this.cache.bumpCompanyVersion(user.companyId);
        return {
            message: `Removed ${employeeIds.length} employee(s) from benefit plan successfully`,
        };
    }
};
exports.BenefitPlanService = BenefitPlanService;
exports.BenefitPlanService = BenefitPlanService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        push_notification_service_1.PushNotificationService])
], BenefitPlanService);
//# sourceMappingURL=benefit-plan.service.js.map