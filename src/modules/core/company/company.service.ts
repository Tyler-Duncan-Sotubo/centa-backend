import { Inject, Injectable } from '@nestjs/common';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companies,
  departments,
  employeeProfiles,
  employees,
  jobRoles,
} from '../schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { holidays } from 'src/modules/leave/schema/holidays.schema';
import { DepartmentService } from '../department/department.service';
import { PayGroupsService } from 'src/modules/payroll/pay-groups/pay-groups.service';
import { LocationsService } from './locations/locations.service';
import { JobRolesService } from '../job-roles/job-roles.service';
import { CostCentersService } from '../cost-centers/cost-centers.service';
import { employeeCompensations } from '../employees/schema/compensation.schema';
import { ReportService } from 'src/modules/payroll/report/report.service';
import { leaveRequests } from 'src/modules/leave/schema/leave-requests.schema';
import { leaveTypes } from 'src/modules/leave/schema/leave-types.schema';
import { ReportService as AttendanceReportService } from 'src/modules/time/report/report.service';
import { announcementCategories, announcements } from 'src/drizzle/schema';
import { AwsService } from 'src/common/aws/aws.service';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { OnboardingSeederService } from 'src/modules/lifecycle/onboarding/seeder.service';
import { LeaveBalanceService } from 'src/modules/leave/balance/leave-balance.service';
import {
  onboardingTemplateChecklists,
  employeeChecklistStatus,
} from 'src/drizzle/schema';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class CompanyService {
  protected table = companies;

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly departmentService: DepartmentService,
    private readonly payGroupService: PayGroupsService,
    private readonly locationService: LocationsService,
    private readonly jobRoleService: JobRolesService,
    private readonly costCenterService: CostCentersService,
    private readonly payrollReport: ReportService,
    private readonly attendanceReport: AttendanceReportService,
    private readonly awsService: AwsService,
    private readonly permissionsService: PermissionsService,
    private readonly onboardingSeederService: OnboardingSeederService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  // ---- TTLs -------------------------------------------------------------
  private ttlCompany = 120 * 60;
  private ttlSummary = 60 * 60;
  private ttlElements = 60 * 60;
  private ttlAllCompanies = 60 * 60;

  // ---- Tag helper (used for Redis tag invalidation if available) -------
  private tags(companyId: string) {
    return [
      `company:${companyId}:company`,
      `company:${companyId}:summary`,
      `company:${companyId}:employees`,
      `company:${companyId}:elements`,
    ];
  }

  // ---- Mutations: bump version to invalidate all company-scoped caches --
  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    userId: string,
    ip: string,
  ) {
    // fetch + validate
    const rows = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();
    if (rows.length === 0) throw new Error('Company not found');
    const current = rows[0];
    if (!current.isActive) throw new Error('Company is inactive');
    if (current.id !== companyId)
      throw new Error('You are not allowed to update this company');

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .execute();

      if (!before) throw new Error('Company not found');

      let logo_url = dto.logo_url;

      if (logo_url?.startsWith('data:image')) {
        const fileName = `company-logo`;
        logo_url = await this.awsService.uploadImageToS3(
          companyId,
          fileName,
          logo_url,
        );
      }

      if (logo_url) dto.logo_url = logo_url;
      else delete dto.logo_url;

      const [after] = await tx
        .update(companies)
        .set(dto as any)
        .where(eq(companies.id, companyId))
        .returning()
        .execute();

      await this.audit.logAction({
        entity: 'Company',
        action: 'Update',
        userId,
        ipAddress: ip,
        changes: {
          ...dto,
          before,
          after,
        },
      });
    });

    // invalidate versioned caches across the company
    await this.cache.bumpCompanyVersion(companyId);

    return 'Company updated successfully';
  }

  async softDelete(id: string) {
    const result = await this.db.transaction(async (tx) => {
      const [company] = await tx
        .update(companies)
        .set({ isActive: false })
        .where(eq(companies.id, id))
        .returning()
        .execute();

      if (!company) throw new Error('Company not found');
      return company;
    });

    await this.cache.bumpCompanyVersion(id);
    return result;
  }

  // ---- Reads (all versioned per company) -------------------------------

  async findOne(id: string) {
    return this.cache.getOrSetVersioned(
      id,
      ['company', 'one'],
      async () => {
        const rows = await this.db
          .select()
          .from(companies)
          .where(eq(companies.id, id))
          .execute();
        if (rows.length === 0) throw new Error('Company not found');
        return rows[0];
      },
      { ttlSeconds: this.ttlCompany, tags: this.tags(id) },
    );
  }

  async findAllEmployeesInCompany(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company', 'employees', 'active'],
      async () => {
        return this.db
          .select({
            id: employees.id,
            confirmed: employees.confirmed,
            gender: employeeProfiles.gender,
          })
          .from(employees)
          .leftJoin(
            employeeProfiles,
            eq(employeeProfiles.employeeId, employees.id),
          )
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(employees.employmentStatus, 'active'),
            ),
          )
          .execute();
      },
      { ttlSeconds: this.ttlCompany, tags: this.tags(companyId) },
    );
  }

  async getCompanySummary(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company', 'summary'],
      async () => {
        const now = new Date();

        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const prevStartDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        const prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          allEmployees,
          company,
          allHolidays,
          allDepartments,
          payrollSummary,
          recentLeaves,
          attendanceSummary,
          allAnnouncements,
        ] = await Promise.all([
          this.db
            .select({
              id: employees.id,
              employmentStartDate: employees.employmentStartDate,
              employmentEndDate: employees.employmentEndDate,
              employeeNumber: employees.employeeNumber,
              email: employees.email,
              firstName: employees.firstName,
              lastName: employees.lastName,
              departments: departments.name,
              jobRole: jobRoles.title,
              annualGross: employeeCompensations.grossSalary,
            })
            .from(employees)
            .leftJoin(departments, eq(departments.id, employees.departmentId))
            .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
            .leftJoin(
              employeeCompensations,
              eq(employeeCompensations.employeeId, employees.id),
            )
            .where(
              and(
                eq(employees.companyId, companyId),
                eq(employees.employmentStatus, 'active'),
              ),
            )
            .execute(),

          this.db
            .select({ companyName: companies.name })
            .from(companies)
            .where(eq(companies.id, companyId))
            .execute(),

          this.db
            .select({ date: holidays.date, name: holidays.name })
            .from(holidays)
            .where(
              and(
                gte(holidays.date, startDate.toISOString()),
                lte(holidays.date, endDate.toISOString()),
              ),
            )
            .execute(),

          this.db
            .select({
              department: departments.name,
              employees: sql<number>`COUNT(${employees.id})`,
            })
            .from(departments)
            .leftJoin(employees, eq(employees.departmentId, departments.id))
            .where(eq(departments.companyId, companyId))
            .groupBy(departments.name)
            .execute(),

          this.payrollReport.getPayrollSummary(companyId),

          this.db
            .select({
              name: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
              leaveType: leaveTypes.name,
              startDate: leaveRequests.startDate,
              endDate: leaveRequests.endDate,
            })
            .from(leaveRequests)
            .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
            .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
            .where(
              and(
                eq(employees.companyId, companyId),
                eq(leaveRequests.status, 'approved'),
                lte(leaveRequests.startDate, today.toISOString()),
                gte(leaveRequests.endDate, today.toISOString()),
              ),
            )
            .orderBy(desc(leaveRequests.startDate))
            .execute(),

          this.attendanceReport.getLast6MonthsAttendanceSummary(companyId),

          this.db
            .select({ id: announcements.id, title: announcements.title })
            .from(announcements)
            .where(eq(announcements.companyId, companyId))
            .execute(),
        ]);

        const totalEmployees = allEmployees.filter(
          (e) =>
            !e.employmentEndDate || new Date(e.employmentEndDate) > endDate,
        ).length;

        const newStarters = allEmployees.filter((e) => {
          const start = new Date(e.employmentStartDate);
          return start >= startDate && start <= endDate;
        });

        const leavers = allEmployees.filter((e) => {
          if (!e.employmentEndDate) return false;
          const end = new Date(e.employmentEndDate);
          return end >= startDate && end <= endDate;
        });

        const prevNewStarters = allEmployees.filter((e) => {
          const start = new Date(e.employmentStartDate);
          return start >= prevStartDate && start <= prevEndDate;
        });

        const prevLeavers = allEmployees.filter((e) => {
          if (!e.employmentEndDate) return false;
          const end = new Date(e.employmentEndDate);
          return end >= prevStartDate && end <= prevEndDate;
        });

        const prevTotalEmployees = allEmployees.filter(
          (e) =>
            !e.employmentEndDate || new Date(e.employmentEndDate) > prevEndDate,
        ).length;

        const onboardingSettings =
          await this.companySettingsService.getOnboardingVisibility(companyId);

        const tasksArray = Object.entries(onboardingSettings);
        const completed = tasksArray.filter(([, done]) => done).length;
        const total = tasksArray.length;
        const allTasksCompleted = completed === total;

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
          onboardingTaskCompleted: allTasksCompleted,
        };
      },
      { ttlSeconds: this.ttlSummary, tags: this.tags(companyId) },
    );
  }

  async getEmployeeSummary(employeeId: string) {
    // fetch companyId for versioned caching
    const [{ companyId }] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();

    return this.cache.getOrSetVersioned(
      companyId,
      ['company', 'employee-summary', employeeId],
      async () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          allHolidays,
          recentLeaves,
          allAnnouncements,
          leaveBalance,
          pendingChecklists,
        ] = await Promise.all([
          this.db
            .select({
              id: holidays.id,
              date: holidays.date,
              name: holidays.name,
              type: holidays.type,
            })
            .from(holidays)
            .where(
              and(
                gte(holidays.date, startDate.toISOString()),
                lte(holidays.date, endDate.toISOString()),
              ),
            )
            .execute(),

          this.db
            .select({
              leaveType: leaveTypes.name,
              startDate: leaveRequests.startDate,
              endDate: leaveRequests.endDate,
            })
            .from(leaveRequests)
            .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
            .where(
              and(
                eq(leaveRequests.employeeId, employeeId),
                eq(leaveRequests.status, 'approved'),
                lte(leaveRequests.startDate, today.toISOString()),
                gte(leaveRequests.endDate, today.toISOString()),
              ),
            )
            .orderBy(desc(leaveRequests.startDate))
            .execute(),

          this.db
            .select({
              id: announcements.id,
              title: announcements.title,
              body: sql<string>`LEFT(${announcements.body}, 100)`.as('body'),
              createdAt: announcements.createdAt,
              category: announcementCategories.name,
            })
            .from(announcements)
            .innerJoin(
              announcementCategories,
              eq(announcements.categoryId, announcementCategories.id),
            )
            .where(eq(announcements.companyId, companyId))
            .orderBy(desc(announcements.createdAt))
            .execute(),

          this.leaveBalanceService.findByEmployeeId(employeeId),

          this.db
            .select({
              statusId: employeeChecklistStatus.id,
              checkListStatus: employeeChecklistStatus.status,
              checklistId: employeeChecklistStatus.checklistId,
              title: onboardingTemplateChecklists.title,
              dueDaysAfterStart: onboardingTemplateChecklists.dueDaysAfterStart,
              startDate: employeeChecklistStatus.completedAt,
            })
            .from(employeeChecklistStatus)
            .innerJoin(
              onboardingTemplateChecklists,
              eq(
                onboardingTemplateChecklists.id,
                employeeChecklistStatus.checklistId,
              ),
            )
            .where(
              and(
                eq(employeeChecklistStatus.employeeId, employeeId),
                eq(employeeChecklistStatus.status, 'pending'),
              ),
            ),
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
          leaveBalance: { total, breakdown },
          pendingChecklists,
        };
      },
      { ttlSeconds: this.ttlSummary, tags: this.tags(companyId) },
    );
  }

  async getCompanyElements(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company', 'elements'],
      async () => {
        // child services should themselves bump company version on writes
        const [
          departmentsRes,
          payGroups,
          locations,
          jobRolesRes,
          costCenters,
          roles,
          templates,
        ] = await Promise.all([
          this.departmentService.findAll(companyId),
          this.payGroupService.findAll(companyId),
          this.locationService.findAll(companyId),
          this.jobRoleService.findAll(companyId),
          this.costCenterService.findAll(companyId),
          this.permissionsService.getRolesByCompany(companyId),
          this.onboardingSeederService.getTemplatesByCompanySummaries(
            companyId,
          ),
        ]);

        return {
          departments: departmentsRes,
          payGroups,
          locations,
          jobRoles: jobRolesRes,
          costCenters,
          roles,
          templates,
        };
      },
      { ttlSeconds: this.ttlElements, tags: this.tags(companyId) },
    );
  }

  // ---- Global (non-company-scoped) -------------------------------------

  async getAllCompanies() {
    // cache without versioning (global list rarely changes)
    return this.cache.getOrSetCache(
      'global:companies:all',
      async () => this.db.select().from(companies).execute(),
      { ttlSeconds: this.ttlAllCompanies },
    );
  }
}
