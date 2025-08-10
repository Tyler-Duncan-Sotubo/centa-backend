import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { PinoLogger } from 'nestjs-pino';

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
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CompanyService.name);
  }

  // ---------- cache keys ----------
  private companyKey(id: string) {
    return `co:${id}:one`;
  }
  private empListKey(companyId: string) {
    return `co:${companyId}:employees:active`;
  }
  private summaryKey(companyId: string) {
    return `co:${companyId}:summary`;
  }
  private empSummaryKey(employeeId: string) {
    return `emp:${employeeId}:summary`;
  }
  private elementsKey(companyId: string) {
    return `co:${companyId}:elements`;
  }

  private async burst(opts: { companyId?: string; employeeId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.companyKey(opts.companyId)));
      jobs.push(this.cache.del(this.empListKey(opts.companyId)));
      jobs.push(this.cache.del(this.summaryKey(opts.companyId)));
      jobs.push(this.cache.del(this.elementsKey(opts.companyId)));
    }
    if (opts.employeeId) {
      jobs.push(this.cache.del(this.empSummaryKey(opts.employeeId)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'company:cache:burst');
  }

  // ---------- mutations ----------
  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    userId: string,
    ip: string,
  ) {
    this.logger.info({ companyId, userId }, 'company:update:start');

    const companyRows = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (companyRows.length === 0) {
      this.logger.warn({ companyId }, 'company:update:not-found');
      throw new NotFoundException('Company not found');
    }

    if (!companyRows[0].isActive) {
      this.logger.warn({ companyId }, 'company:update:inactive');
      throw new BadRequestException('Company is inactive');
    }

    await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .execute();

      if (!before) {
        throw new NotFoundException('Company not found');
      }

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
      else delete (dto as any).logo_url;

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

    await this.burst({ companyId });
    this.logger.info({ companyId }, 'company:update:done');
    return 'Company updated successfully';
  }

  async softDelete(id: string) {
    this.logger.info({ id }, 'company:softDelete:start');

    const result = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(companies)
        .set({ isActive: false })
        .where(eq(companies.id, id))
        .returning()
        .execute();

      if (rows.length === 0) {
        throw new NotFoundException('Company not found');
      }
      return rows[0];
    });

    await this.burst({ companyId: id });
    this.logger.info({ id }, 'company:softDelete:done');
    return result;
  }

  // ---------- queries ----------
  async findOne(id: string) {
    const key = this.companyKey(id);
    this.logger.debug({ id, key }, 'company:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, id))
        .execute();

      if (rows.length === 0) {
        this.logger.warn({ id }, 'company:findOne:not-found');
        throw new NotFoundException('Company not found');
      }
      return rows[0];
    });
  }

  async findAllEmployeesInCompany(companyId: string) {
    const key = this.empListKey(companyId);
    this.logger.debug({ companyId, key }, 'company:employees:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
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

      this.logger.debug(
        { companyId, count: rows.length },
        'company:employees:db:done',
      );
      return rows;
    });
  }

  async getCompanySummary(companyId: string) {
    const key = this.summaryKey(companyId);
    this.logger.debug({ companyId, key }, 'company:summary:cache:get');
    const now = new Date();

    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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
        .select({
          date: holidays.date,
          name: holidays.name,
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
      (emp) =>
        !emp.employmentEndDate || new Date(emp.employmentEndDate) > endDate,
    ).length;

    const newStarters = allEmployees.filter((emp) => {
      const start = new Date(emp.employmentStartDate);
      return start >= startDate && start <= endDate;
    });

    const leavers = allEmployees.filter((emp) => {
      if (!emp.employmentEndDate) return false;
      const end = new Date(emp.employmentEndDate);
      return end >= startDate && end <= endDate;
    });

    const prevNewStarters = allEmployees.filter((emp) => {
      const start = new Date(emp.employmentStartDate);
      return start >= prevStartDate && start <= prevEndDate;
    });

    const prevLeavers = allEmployees.filter((emp) => {
      if (!emp.employmentEndDate) return false;
      const end = new Date(emp.employmentEndDate);
      return end >= prevStartDate && end <= prevEndDate;
    });

    const prevTotalEmployees = allEmployees.filter(
      (emp) =>
        !emp.employmentEndDate || new Date(emp.employmentEndDate) > prevEndDate,
    ).length;

    const onboardingSettings =
      await this.companySettingsService.getOnboardingSettings(companyId);

    const tasksArray = Object.entries(onboardingSettings);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const completed = tasksArray.filter(([_, done]) => done).length;
    const total = tasksArray.length;
    const allTasksCompleted = completed === total;

    const result = {
      companyName: company[0]?.companyName ?? company[0]?.companyName,
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

    this.logger.debug({ companyId }, 'company:summary:db:done');
    return result;
  }

  async getEmployeeSummary(employeeId: string) {
    const key = this.empSummaryKey(employeeId);
    this.logger.debug({ employeeId, key }, 'company:empSummary:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const empRows = await this.db
        .select({ companyId: employees.companyId })
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1)
        .execute();

      if (empRows.length === 0) {
        this.logger.warn({ employeeId }, 'company:empSummary:not-found');
        throw new NotFoundException('Employee not found');
      }
      const { companyId } = empRows[0];

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

      const result = {
        allHolidays,
        recentLeaves,
        announcements: allAnnouncements,
        leaveBalance: { total, breakdown },
        pendingChecklists,
      };

      this.logger.debug({ employeeId }, 'company:empSummary:db:done');
      return result;
    });
  }

  async getCompanyElements(companyId: string) {
    const key = this.elementsKey(companyId);
    this.logger.debug({ companyId, key }, 'company:elements:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [
        departmentsData,
        payGroups,
        locations,
        jobRoles,
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
        this.onboardingSeederService.getTemplatesByCompanySummaries(companyId),
      ]);

      const result = {
        departments: departmentsData,
        payGroups,
        locations,
        jobRoles,
        costCenters,
        roles,
        templates,
      };

      this.logger.debug({ companyId }, 'company:elements:db:done');
      return result;
    });
  }

  async getAllCompanies() {
    this.logger.debug({}, 'company:getAll:start');
    const rows = await this.db.select().from(companies).execute();
    this.logger.debug({ count: rows.length }, 'company:getAll:done');
    return rows;
  }
}
