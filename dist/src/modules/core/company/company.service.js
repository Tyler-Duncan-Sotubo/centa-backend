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
exports.CompanyService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../../common/cache/cache.service");
const holidays_schema_1 = require("../../leave/schema/holidays.schema");
const department_service_1 = require("../department/department.service");
const pay_groups_service_1 = require("../../payroll/pay-groups/pay-groups.service");
const locations_service_1 = require("./locations/locations.service");
const job_roles_service_1 = require("../job-roles/job-roles.service");
const cost_centers_service_1 = require("../cost-centers/cost-centers.service");
const compensation_schema_1 = require("../employees/schema/compensation.schema");
const report_service_1 = require("../../payroll/report/report.service");
const leave_requests_schema_1 = require("../../leave/schema/leave-requests.schema");
const leave_types_schema_1 = require("../../leave/schema/leave-types.schema");
const report_service_2 = require("../../time/report/report.service");
const schema_2 = require("../../../drizzle/schema");
const aws_service_1 = require("../../../common/aws/aws.service");
const permissions_service_1 = require("../../auth/permissions/permissions.service");
const seeder_service_1 = require("../../lifecycle/onboarding/seeder.service");
const leave_balance_service_1 = require("../../leave/balance/leave-balance.service");
const schema_3 = require("../../../drizzle/schema");
let CompanyService = class CompanyService {
    constructor(db, cache, audit, departmentService, payGroupService, locationService, jobRoleService, costCenterService, payrollReport, attendanceReport, awsService, permissionsService, onboardingSeederService, leaveBalanceService) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.departmentService = departmentService;
        this.payGroupService = payGroupService;
        this.locationService = locationService;
        this.jobRoleService = jobRoleService;
        this.costCenterService = costCenterService;
        this.payrollReport = payrollReport;
        this.attendanceReport = attendanceReport;
        this.awsService = awsService;
        this.permissionsService = permissionsService;
        this.onboardingSeederService = onboardingSeederService;
        this.leaveBalanceService = leaveBalanceService;
        this.table = schema_1.companies;
    }
    async update(companyId, dto, userId, ip) {
        const company = await this.db
            .select()
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .execute();
        if (!company) {
            throw new Error('Company not found');
        }
        if (!company[0].isActive) {
            throw new Error('Company is inactive');
        }
        if (company[0].id !== companyId) {
            throw new Error('You are not allowed to update this company');
        }
        await this.db.transaction(async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.companies)
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                .execute();
            if (!before) {
                throw new Error('Company not found');
            }
            let logo_url = dto.logo_url;
            if (logo_url?.startsWith('data:image')) {
                const fileName = `company-logo`;
                logo_url = await this.awsService.uploadImageToS3(companyId, fileName, logo_url);
            }
            if (logo_url) {
                dto.logo_url = logo_url;
            }
            else {
                delete dto.logo_url;
            }
            const [after] = await tx
                .update(schema_1.companies)
                .set(dto)
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                .returning()
                .execute();
            await this.audit.logAction({
                entity: 'Company',
                action: 'Update',
                userId,
                ipAddress: ip,
                changes: {
                    ...dto,
                    before: before[0],
                    after: after[0],
                },
            });
        });
        return 'Company updated successfully';
    }
    async findOne(id) {
        const company = await this.db
            .select()
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, id))
            .execute();
        if (!company) {
            throw new Error('Company not found');
        }
        return company[0];
    }
    async findAllEmployeesInCompany(companyId) {
        const cacheKey = `company:${companyId}:employees`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return this.db
                .select({
                id: schema_1.employees.id,
                confirmed: schema_1.employees.confirmed,
                gender: schema_1.employeeProfiles.gender,
            })
                .from(schema_1.employees)
                .leftJoin(schema_1.employeeProfiles, (0, drizzle_orm_1.eq)(schema_1.employeeProfiles.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
                .execute();
        });
    }
    async softDelete(id) {
        const result = await this.db.transaction(async (tx) => {
            const company = await tx
                .update(schema_1.companies)
                .set({ isActive: false })
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, id))
                .returning()
                .execute();
            if (!company) {
                throw new Error('Company not found');
            }
            return company[0];
        });
        return result;
    }
    async getCompanySummary(companyId) {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [allEmployees, company, allHolidays, allDepartments, payrollSummary, recentLeaves, attendanceSummary, allAnnouncements,] = await Promise.all([
            this.db
                .select({
                id: schema_1.employees.id,
                employmentStartDate: schema_1.employees.employmentStartDate,
                employmentEndDate: schema_1.employees.employmentEndDate,
                employeeNumber: schema_1.employees.employeeNumber,
                email: schema_1.employees.email,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                departments: schema_1.departments.name,
                jobRole: schema_1.jobRoles.title,
                annualGross: compensation_schema_1.employeeCompensations.grossSalary,
            })
                .from(schema_1.employees)
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                .leftJoin(compensation_schema_1.employeeCompensations, (0, drizzle_orm_1.eq)(compensation_schema_1.employeeCompensations.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
                .execute(),
            this.db
                .select({ companyName: schema_1.companies.name })
                .from(schema_1.companies)
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                .execute(),
            this.db
                .select({
                date: holidays_schema_1.holidays.date,
                name: holidays_schema_1.holidays.name,
            })
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(holidays_schema_1.holidays.date, startDate.toISOString()), (0, drizzle_orm_1.lte)(holidays_schema_1.holidays.date, endDate.toISOString())))
                .execute(),
            this.db
                .select({
                department: schema_1.departments.name,
                employees: (0, drizzle_orm_1.sql) `COUNT(${schema_1.employees.id})`,
            })
                .from(schema_1.departments)
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
                .groupBy(schema_1.departments.name)
                .execute(),
            this.payrollReport.getPayrollSummary(companyId),
            this.db
                .select({
                name: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                leaveType: leave_types_schema_1.leaveTypes.name,
                startDate: leave_requests_schema_1.leaveRequests.startDate,
                endDate: leave_requests_schema_1.leaveRequests.endDate,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, schema_1.employees.id))
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.status, 'approved'), (0, drizzle_orm_1.lte)(leave_requests_schema_1.leaveRequests.startDate, today.toISOString()), (0, drizzle_orm_1.gte)(leave_requests_schema_1.leaveRequests.endDate, today.toISOString())))
                .orderBy((0, drizzle_orm_1.desc)(leave_requests_schema_1.leaveRequests.startDate))
                .execute(),
            this.attendanceReport.getLast6MonthsAttendanceSummary(companyId),
            this.db
                .select({ id: schema_2.announcements.id, title: schema_2.announcements.title })
                .from(schema_2.announcements)
                .where((0, drizzle_orm_1.eq)(schema_2.announcements.companyId, companyId))
                .execute(),
        ]);
        const totalEmployees = allEmployees.filter((emp) => !emp.employmentEndDate || new Date(emp.employmentEndDate) > endDate).length;
        const newStarters = allEmployees.filter((emp) => {
            const start = new Date(emp.employmentStartDate);
            return start >= startDate && start <= endDate;
        });
        const leavers = allEmployees.filter((emp) => {
            if (!emp.employmentEndDate)
                return false;
            const end = new Date(emp.employmentEndDate);
            return end >= startDate && end <= endDate;
        });
        const prevNewStarters = allEmployees.filter((emp) => {
            const start = new Date(emp.employmentStartDate);
            return start >= prevStartDate && start <= prevEndDate;
        });
        const prevLeavers = allEmployees.filter((emp) => {
            if (!emp.employmentEndDate)
                return false;
            const end = new Date(emp.employmentEndDate);
            return end >= prevStartDate && end <= prevEndDate;
        });
        const prevTotalEmployees = allEmployees.filter((emp) => !emp.employmentEndDate || new Date(emp.employmentEndDate) > prevEndDate).length;
        return {
            companyName: company[0].companyName,
            allHolidays,
            totalEmployees,
            allEmployees,
            allDepartments,
            newStartersCount: newStarters.length,
            leaversCount: leavers.length,
            previousMonth: {
                totalEmployees: prevTotalEmployees,
                newStartersCount: prevNewStarters.length,
                leaversCount: prevLeavers.length,
            },
            payrollSummary,
            recentLeaves,
            attendanceSummary,
            announcements: allAnnouncements,
        };
    }
    async getEmployeeSummary(employeeId) {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [{ companyId }] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        const [allHolidays, recentLeaves, allAnnouncements, leaveBalance, pendingChecklists,] = await Promise.all([
            this.db
                .select({
                id: holidays_schema_1.holidays.id,
                date: holidays_schema_1.holidays.date,
                name: holidays_schema_1.holidays.name,
                type: holidays_schema_1.holidays.type,
            })
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(holidays_schema_1.holidays.date, startDate.toISOString()), (0, drizzle_orm_1.lte)(holidays_schema_1.holidays.date, endDate.toISOString())))
                .execute(),
            this.db
                .select({
                leaveType: leave_types_schema_1.leaveTypes.name,
                startDate: leave_requests_schema_1.leaveRequests.startDate,
                endDate: leave_requests_schema_1.leaveRequests.endDate,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, employeeId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.status, 'approved'), (0, drizzle_orm_1.lte)(leave_requests_schema_1.leaveRequests.startDate, today.toISOString()), (0, drizzle_orm_1.gte)(leave_requests_schema_1.leaveRequests.endDate, today.toISOString())))
                .orderBy((0, drizzle_orm_1.desc)(leave_requests_schema_1.leaveRequests.startDate))
                .execute(),
            this.db
                .select({
                id: schema_2.announcements.id,
                title: schema_2.announcements.title,
                body: (0, drizzle_orm_1.sql) `LEFT(${schema_2.announcements.body}, 100)`.as('body'),
                createdAt: schema_2.announcements.createdAt,
                category: schema_2.announcementCategories.name,
            })
                .from(schema_2.announcements)
                .innerJoin(schema_2.announcementCategories, (0, drizzle_orm_1.eq)(schema_2.announcements.categoryId, schema_2.announcementCategories.id))
                .where((0, drizzle_orm_1.eq)(schema_2.announcements.companyId, companyId))
                .orderBy((0, drizzle_orm_1.desc)(schema_2.announcements.createdAt))
                .execute(),
            this.leaveBalanceService.findByEmployeeId(employeeId),
            this.db
                .select({
                statusId: schema_3.employeeChecklistStatus.id,
                checkListStatus: schema_3.employeeChecklistStatus.status,
                checklistId: schema_3.employeeChecklistStatus.checklistId,
                title: schema_3.onboardingTemplateChecklists.title,
                dueDaysAfterStart: schema_3.onboardingTemplateChecklists.dueDaysAfterStart,
                startDate: schema_3.employeeChecklistStatus.completedAt,
            })
                .from(schema_3.employeeChecklistStatus)
                .innerJoin(schema_3.onboardingTemplateChecklists, (0, drizzle_orm_1.eq)(schema_3.onboardingTemplateChecklists.id, schema_3.employeeChecklistStatus.checklistId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_3.employeeChecklistStatus.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_3.employeeChecklistStatus.status, 'pending'))),
        ]);
        const breakdown = leaveBalance.map((b) => ({
            type: b.leaveTypeName,
            balance: parseFloat(b.balance),
        }));
        const total = breakdown.reduce((sum, item) => sum + item.balance, 0);
        return {
            allHolidays,
            recentLeaves,
            announcements: allAnnouncements,
            leaveBalance: {
                total,
                breakdown,
            },
            pendingChecklists,
        };
    }
    async getCompanyElements(companyId) {
        const [departments, payGroups, locations, jobRoles, costCenters, roles, templates,] = await Promise.all([
            this.departmentService.findAll(companyId),
            this.payGroupService.findAll(companyId),
            this.locationService.findAll(companyId),
            this.jobRoleService.findAll(companyId),
            this.costCenterService.findAll(companyId),
            this.permissionsService.getRolesByCompany(companyId),
            this.onboardingSeederService.getTemplatesByCompanySummaries(companyId),
        ]);
        return {
            departments,
            payGroups,
            locations,
            jobRoles,
            costCenters,
            roles,
            templates,
        };
    }
};
exports.CompanyService = CompanyService;
exports.CompanyService = CompanyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        department_service_1.DepartmentService,
        pay_groups_service_1.PayGroupsService,
        locations_service_1.LocationsService,
        job_roles_service_1.JobRolesService,
        cost_centers_service_1.CostCentersService,
        report_service_1.ReportService,
        report_service_2.ReportService,
        aws_service_1.AwsService,
        permissions_service_1.PermissionsService,
        seeder_service_1.OnboardingSeederService,
        leave_balance_service_1.LeaveBalanceService])
], CompanyService);
//# sourceMappingURL=company.service.js.map