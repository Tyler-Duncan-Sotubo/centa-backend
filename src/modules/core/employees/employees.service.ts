import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companies,
  companyLocations,
  costCenters,
  departments,
  employeeDependents,
  employeeFinancials,
  employeeProfiles,
  employees,
  jobRoles,
} from '../schema';
import { employeeSequences } from './schema/employee-sequences.schema';
import {
  eq,
  and,
  inArray,
  or,
  ilike,
  SQL,
  sql,
  ne,
  gte,
  lte,
} from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import {
  attendanceRecords,
  companyRoles,
  PasswordResetToken,
  users,
} from 'src/drizzle/schema';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ProfileService } from './profile/profile.service';
import { HistoryService } from './history/history.service';
import { DependentsService } from './dependents/dependents.service';
import { CertificationsService } from './certifications/certifications.service';
import { CompensationService } from './compensation/compensation.service';
import { FinanceService } from './finance/finance.service';
import { Workbook } from 'exceljs';
import { DepartmentService } from '../department/department.service';
import { JobRolesService } from '../job-roles/job-roles.service';
import { CostCentersService } from '../cost-centers/cost-centers.service';
import { employeeCompensations } from './schema/compensation.schema';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCompensationDto } from './compensation/dto/create-compensation.dto';
import { CreateFinanceDto } from './finance/dto/create-finance.dto';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { SearchEmployeesDto } from './dto/search-employees.dto';
import { GroupsService } from './groups/groups.service';
import { ConfigService } from '@nestjs/config';
import { EmployeeInvitationService } from 'src/modules/notification/services/employee-invitation.service';
import { CacheService } from 'src/common/cache/cache.service';
import { payGroups } from 'src/modules/payroll/schema/pay-groups.schema';
import { CreateEmployeeMultiDetailsDto } from './dto/create-employee-multi-details.dto';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { LeaveBalanceService } from 'src/modules/leave/balance/leave-balance.service';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { AttendanceSettingsService } from 'src/modules/time/settings/attendance-settings.service';
import { EmployeeShiftsService } from 'src/modules/time/employee-shifts/employee-shifts.service';
import { PayslipService } from 'src/modules/payroll/payslip/payslip.service';
import { leaveRequests } from 'src/modules/leave/schema/leave-requests.schema';
import { leaveTypes } from 'src/modules/leave/schema/leave-types.schema';
import { EmployeeProfileDto } from './dto/update-employee-details.dto';
import { OnboardingService } from 'src/modules/lifecycle/onboarding/onboarding.service';

@Injectable()
export class EmployeesService {
  protected table = employees;

  constructor(
    @Inject(DRIZZLE) private db: db,
    private audit: AuditService,
    private profileService: ProfileService,
    private historyService: HistoryService,
    private dependentsService: DependentsService,
    private certificationsService: CertificationsService,
    private compensationService: CompensationService,
    private financeService: FinanceService,
    private deptSvc: DepartmentService,
    private roleSvc: JobRolesService,
    private ccSvc: CostCentersService,
    private groupsService: GroupsService,
    private readonly config: ConfigService,
    private readonly employeeInvitationService: EmployeeInvitationService,
    private readonly cacheService: CacheService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly permissionService: PermissionsService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly employeeShiftsService: EmployeeShiftsService,
    private readonly payslipService: PayslipService,
    private readonly onboardingService: OnboardingService,
  ) {}

  // ---------- Cache key helpers ----------
  private kCompany(companyId: string, ...parts: string[]) {
    return parts; // parts used by versioned keys
  }
  private kEmployee(employeeId: string, ...parts: string[]) {
    return ['employee', employeeId, ...parts];
  }

  private generateToken(payload: any): string {
    const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
    return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
  }

  async createEmployeeNumber(companyId: string) {
    // sequence mutations bypass cache
    const [seqRow] = await this.db
      .select({ next: employeeSequences.nextNumber })
      .from(employeeSequences)
      .where(eq(employeeSequences.companyId, companyId))
      .execute();

    let seq = 1;
    if (!seqRow) {
      await this.db
        .insert(employeeSequences)
        .values({ companyId, nextNumber: 2 })
        .execute();
    } else {
      seq = seqRow.next;
      await this.db
        .update(employeeSequences)
        .set({ nextNumber: seq + 1 })
        .where(eq(employeeSequences.companyId, companyId))
        .execute();
    }
    return `HR${String(seq).padStart(2, '0')}`;
  }

  async create(dto: CreateEmployeeCoreDto, currentUser: User) {
    const { companyId, id } = currentUser;

    const emp = await this.db.transaction(async (trx) => {
      // sequence
      const [seqRow] = await trx
        .select({ next: employeeSequences.nextNumber })
        .from(employeeSequences)
        .where(eq(employeeSequences.companyId, companyId))
        .execute();

      let seq = 1;
      if (!seqRow) {
        await trx
          .insert(employeeSequences)
          .values({ companyId, nextNumber: 2 })
          .execute();
      } else {
        seq = seqRow.next;
        await trx
          .update(employeeSequences)
          .set({ nextNumber: seq + 1 })
          .where(eq(employeeSequences.companyId, companyId))
          .execute();
      }
      const empNum = dto.employeeNumber ?? `HR${String(seq).padStart(2, '0')}`;

      // user
      const existing = await trx
        .select()
        .from(users)
        .where(eq(users.email, dto.email.toLowerCase()))
        .execute();
      if (existing.length)
        throw new BadRequestException('Email already in use');

      const token = this.generateToken({ email: dto.email });
      const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);

      const [authUser] = await trx
        .insert(users)
        .values({
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: token,
          companyRoleId: dto.companyRoleId,
          companyId,
        })
        .returning({ id: users.id })
        .execute();

      const [emp] = await trx
        .insert(employees)
        .values({
          companyId,
          userId: authUser.id,
          employeeNumber: empNum,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email.toLowerCase(),
          employmentStatus: dto.employmentStatus as any,
          departmentId: dto.departmentId,
          jobRoleId: dto.jobRoleId,
          costCenterId: dto.costCenterId,
          locationId: dto.locationId,
          payGroupId: dto.payGroupId,
          employmentStartDate: dto.employmentStartDate,
          confirmed: false,
        })
        .returning({
          id: employees.id,
          employeeNumber: employees.employeeNumber,
          email: employees.email,
          firstName: employees.firstName,
        })
        .execute();

      await trx
        .insert(PasswordResetToken)
        .values({ user_id: authUser.id, token, expires_at, is_used: false })
        .execute();

      const [company] = await trx
        .select({ name: companies.name, id: companies.id })
        .from(companies)
        .where(eq(companies.id, companyId))
        .execute();

      if (dto.onboardingTemplateId) {
        await this.onboardingService.assignOnboardingTemplate(
          emp.id,
          dto.onboardingTemplateId,
          company.id,
          trx,
        );
      }

      if (dto.grossSalary) {
        await this.compensationService.create(
          emp.id,
          {
            grossSalary: dto.grossSalary,
            currency: 'NGN',
            effectiveDate: dto.employmentStartDate,
          } as CreateCompensationDto,
          id,
          'system',
          trx,
        );
      }

      const inviteLink = `${this.config.get(
        'EMPLOYEE_PORTAL_URL',
      )}/auth/reset-password/${token}`;
      await this.employeeInvitationService.sendInvitationEmail(
        emp.email,
        emp.firstName,
        company.name,
        'Employee',
        inviteLink,
      );

      await this.companySettingsService.setSetting(
        companyId,
        'onboarding_upload_employees',
        true,
      );

      return emp;
    });

    // 🔄 invalidate versioned cache for the company
    await this.cacheService.bumpCompanyVersion(companyId);
    await this.cacheService.invalidateTags([
      'employees:list',
      'employees:summary',
    ]);

    return emp;
  }

  async createEmployee(
    dto: CreateEmployeeMultiDetailsDto,
    user: User,
    employee_id?: string,
  ) {
    let employeeId: string;
    if (employee_id) {
      employeeId = employee_id;
    } else {
      const employee = await this.create(dto, user);
      employeeId = employee.id;
    }

    await this.db.transaction(async (tx) => {
      const hasProfileData =
        !!dto.dateOfBirth ||
        !!dto.gender ||
        !!dto.maritalStatus ||
        !!dto.address ||
        !!dto.state ||
        !!dto.country ||
        !!dto.emergencyName ||
        !!dto.emergencyPhone;

      if (hasProfileData) {
        await tx.insert(employeeProfiles).values({
          employeeId,
          dateOfBirth: dto.dateOfBirth,
          gender: dto.gender,
          maritalStatus: dto.maritalStatus,
          address: dto.address,
          state: dto.state,
          country: dto.country,
          emergencyName: dto.emergencyName,
          emergencyPhone: dto.emergencyPhone,
        });
      }

      const hasCompensationData =
        dto.grossSalary !== undefined || dto.currency !== undefined;
      if (hasCompensationData) {
        await tx.insert(employeeCompensations).values({
          employeeId,
          grossSalary: dto.grossSalary,
          currency: dto.currency,
          effectiveDate: dto.employmentStartDate,
        });
      }

      const hasFinanceData =
        dto.bankName !== undefined ||
        dto.bankAccountNumber !== undefined ||
        dto.bankBranch !== undefined ||
        dto.tin !== undefined ||
        dto.pensionPin !== undefined;

      if (hasFinanceData) {
        await tx.insert(employeeFinancials).values({
          employeeId,
          bankName: dto.bankName,
          bankAccountNumber: dto.bankAccountNumber,
          bankAccountName: dto.bankAccountName,
          bankBranch: dto.bankBranch,
          currency: dto.currency,
          tin: dto.tin,
          pensionPin: dto.pensionPin,
          nhfNumber: dto.nhfNumber,
        });
      }

      const hasDependentData =
        !!dto.name || !!dto.relationship || !!dto.dependentDob;
      if (hasDependentData) {
        await tx.insert(employeeDependents).values({
          employeeId,
          name: dto.name,
          relationship: dto.relationship,
          isBeneficiary: dto.isBeneficiary,
          dateOfBirth: dto.dependentDob.toString(),
        });
      }
    });

    // 🔄 invalidate
    await this.cacheService.bumpCompanyVersion(user.companyId);
    await this.cacheService.invalidateTags([
      `employee:${employeeId}`,
      'employees:list',
      'employees:summary',
    ]);

    return employeeId;
  }

  async findAll(employeeId: string, companyId: string, month?: string) {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const targetMonth = month || currentMonth;

    return this.cacheService.getOrSetVersioned(
      companyId,
      this.kEmployee(employeeId, 'all', targetMonth),
      async () => {
        const employee = await this.findOne(employeeId, companyId);

        const safe = <T>(promise: Promise<T>): Promise<T | null> =>
          promise.catch((err) => {
            console.error('Error in findAll:', err);
            return null;
          });

        const [
          core,
          finance,
          profile,
          history,
          dependents,
          certifications,
          compensation,
          leaveBalance,
          leaves,
          attendance,
          payslipSummary,
        ] = await Promise.all([
          safe(this.findOne(employeeId, companyId)),
          safe(this.financeService.findOne(employeeId)),
          safe(this.profileService.findOne(employeeId)),
          safe(this.historyService.findAll(employeeId)),
          safe(this.dependentsService.findAll(employeeId)),
          safe(this.certificationsService.findAll(employeeId)),
          safe(this.compensationService.findAll(employeeId)),
          safe(this.leaveBalanceService.findByEmployeeId(employeeId)),
          safe(this.findAllLeaveRequestByEmployeeId(employeeId, companyId)),
          safe(
            this.getEmployeeAttendanceByMonth(
              employeeId,
              companyId,
              targetMonth,
            ),
          ),
          safe(this.payslipService.getEmployeePayslipSummary(employeeId)),
        ]);

        return {
          core,
          profile,
          history,
          dependents,
          certifications,
          compensation,
          finance,
          leaveBalance,
          leaveRequests: leaves,
          attendance,
          payslipSummary,
          avatarUrl: (employee as any).avatarUrl
            ? (employee as any).avatarUrl
            : '',
        };
      },
      { tags: [`employee:${employeeId}`] },
    );
  }

  async getEmployeeByUserId(user_id: string) {
    // We need companyId for versioned cache → quick fetch
    const [empRow] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.userId, user_id))
      .limit(1)
      .execute();
    if (!empRow) {
      throw new BadRequestException(
        'Employee not found, please provide a valid email',
      );
    }
    const companyId = empRow.companyId;

    return this.cacheService.getOrSetVersioned(
      companyId,
      ['employeeByUser', user_id],
      async () => {
        const result = await this.db
          .select({
            first_name: employees.firstName,
            last_name: employees.lastName,
            avatar: users.avatar,
            userId: employees.userId,
            email: employees.email,
            group_id: employees.payGroupId,
            companyId: companies.id,
            id: employees.id,
            company_name: companies.name,
            start_date: employees.employmentStartDate,
            department_name: departments.name,
            job_role: jobRoles.title,
            employee_number: employees.employeeNumber,
            managerId: employees.managerId,
            location: companyLocations.name,
          })
          .from(employees)
          .innerJoin(companies, eq(companies.id, employees.companyId))
          .innerJoin(users, eq(users.id, employees.userId))
          .leftJoin(
            companyLocations,
            eq(companyLocations.id, employees.locationId),
          )
          .leftJoin(departments, eq(departments.id, employees.departmentId))
          .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
          .where(eq(employees.userId, user_id))
          .execute();

        if (!result.length) {
          throw new BadRequestException(
            'Employee not found, please provide a valid email',
          );
        }

        let employeeManager = { id: '', name: '', email: '' };

        const managerId = result[0].managerId;
        if (managerId) {
          const [manager] = await this.db
            .select({
              id: employees.id,
              name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
              email: employees.email,
            })
            .from(employees)
            .innerJoin(users, eq(employees.userId, users.id))
            .where(eq(employees.id, managerId))
            .execute();

          if (manager) {
            employeeManager = {
              id: manager.id,
              email: manager.email,
              name: manager.name || '',
            };
          }
        } else {
          const superAdminUserId = await this.findSuperAdminUser(
            result[0].companyId,
          );
          const [superAdmin] = await this.db
            .select({
              id: users.id,
              name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, superAdminUserId))
            .execute();

          if (superAdmin) {
            employeeManager = {
              id: superAdmin.id,
              name: superAdmin.name || '',
              email: superAdmin.email,
            };
          }
        }

        return { ...result[0], employeeManager };
      },
      { tags: ['employees:byUser'] },
    );
  }

  async employeeSalaryDetails(user: User, employeeId: string) {
    return this.cacheService.getOrSetVersioned(
      user.companyId,
      this.kEmployee(employeeId, 'salaryDetails'),
      async () => {
        const companyAllowance =
          await this.companySettingsService.getAllowanceConfig(user.companyId);
        const compensations =
          await this.compensationService.findAll(employeeId);
        return { companyAllowance, compensations };
      },
      { tags: [`employee:${employeeId}`] },
    );
  }

  async employeeFinanceDetails(employeeId: string) {
    // fetch companyId for versioned cache
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();
    if (!row) throw new NotFoundException('Employee not found.');

    return this.cacheService.getOrSetVersioned(
      row.companyId,
      this.kEmployee(employeeId, 'finance'),
      () => this.financeService.findOne(employeeId),
      { tags: [`employee:${employeeId}`] },
    );
  }

  async findAllEmployees(companyId: string) {
    return this.cacheService.getOrSetVersioned(
      companyId,
      this.kCompany(companyId, 'employees', 'active'),
      async () => {
        return this.db
          .select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            employeeNumber: employees.employeeNumber,
            email: employees.email,
            departmentId: employees.departmentId,
            department: departments.name,
            employmentStatus: employees.employmentStatus,
            jobRole: jobRoles.title,
            costCenter: costCenters.name,
            location: companyLocations.name,
            annualGross: employeeCompensations.grossSalary,
            groupId: employees.payGroupId,
            applyNHf: employeeCompensations.applyNHf,
            role: companyRoles.name,
          })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .leftJoin(
            employeeCompensations,
            eq(employees.id, employeeCompensations.employeeId),
          )
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
          .leftJoin(costCenters, eq(employees.costCenterId, costCenters.id))
          .leftJoin(
            companyLocations,
            eq(employees.locationId, companyLocations.id),
          )
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(employees.employmentStatus, 'active'),
            ),
          )
          .execute();
      },
      { tags: ['employees:list'] },
    );
  }

  async findAllCompanyEmployeesSummary(companyId: string, search?: string) {
    // No search → cached top 10
    if (!search) {
      return this.cacheService.getOrSetVersioned(
        companyId,
        this.kCompany(companyId, 'employees', 'summary', 'top10'),
        async () => {
          return this.db
            .select({
              id: employees.id,
              firstName: employees.firstName,
              lastName: employees.lastName,
              employeeNumber: employees.employeeNumber,
            })
            .from(employees)
            .where(
              and(
                eq(employees.companyId, companyId),
                eq(employees.employmentStatus, 'active'),
              ),
            )
            .limit(10)
            .execute();
        },
        {
          ttlSeconds: 60 * 60 * 12, // 12h
          tags: ['employees:summary'],
        },
      );
    }

    // With search → query DB (not filtering the top10)
    const q = search.toLowerCase();

    return this.cacheService.getOrSetVersioned(
      companyId,
      this.kCompany(companyId, 'employees', 'summary', 'search', q),
      async () => {
        return this.db
          .select({
            id: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            employeeNumber: employees.employeeNumber,
          })
          .from(employees)
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(employees.employmentStatus, 'active'),
              // Match first, last or employeeNumber
              // (use ilike if your dialect supports it; otherwise like + lower())
              or(
                ilike(employees.firstName, `%${q}%`),
                ilike(employees.lastName, `%${q}%`),
                ilike(employees.employeeNumber, `%${q}%`),
              ),
            ),
          )
          .limit(10)
          .execute();
      },
      {
        ttlSeconds: 60 * 60 * 12, // 12h
        tags: ['employees:summary', 'employees:search'],
      },
    );
  }

  async findOneByUserId(userId: string) {
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1)
      .execute();
    if (!row) throw new NotFoundException('Employee not found');

    return this.cacheService.getOrSetVersioned(
      row.companyId,
      ['employeeCoreByUser', userId],
      async () => {
        const [employee] = await this.db
          .select()
          .from(this.table)
          .where(eq(this.table.userId, userId))
          .execute();
        if (!employee) throw new NotFoundException('Employee not found');
        return employee;
      },
      { tags: ['employees:byUser'] },
    );
  }

  async findOne(employeeId: string, companyId: string) {
    return this.cacheService.getOrSetVersioned(
      companyId,
      this.kEmployee(employeeId, 'core'),
      async () => {
        const [employee] = await this.db
          .select({
            id: this.table.id,
            firstName: this.table.firstName,
            lastName: this.table.lastName,
            employeeNumber: this.table.employeeNumber,
            email: this.table.email,
            employmentStatus: this.table.employmentStatus,
            probationEndDate: this.table.probationEndDate,
            departmentId: this.table.departmentId,
            department: departments.name,
            jobRoleId: this.table.jobRoleId,
            jobRole: jobRoles.title,
            costCenter: costCenters.name,
            costCenterId: this.table.costCenterId,
            location: companyLocations.name,
            payGroupId: this.table.payGroupId,
            locationId: this.table.locationId,
            payGroup: payGroups.name,
            managerId: this.table.managerId,
            avatarUrl: users.avatar,
            effectiveDate: this.table.employmentStartDate,
            companyRoleId: users.companyRoleId,
            role: companyRoles.name,
            confirmed: this.table.confirmed,
          })
          .from(this.table)
          .innerJoin(users, eq(this.table.userId, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .leftJoin(departments, eq(this.table.departmentId, departments.id))
          .leftJoin(jobRoles, eq(this.table.jobRoleId, jobRoles.id))
          .leftJoin(costCenters, eq(this.table.costCenterId, costCenters.id))
          .leftJoin(
            companyLocations,
            eq(this.table.locationId, companyLocations.id),
          )
          .leftJoin(payGroups, eq(this.table.payGroupId, payGroups.id))
          .where(
            and(
              eq(this.table.id, employeeId),
              eq(this.table.companyId, companyId),
            ),
          )
          .execute();

        if (!employee) throw new BadRequestException('Employee not found');

        let employeeManager = {
          id: '',
          firstName: '',
          lastName: '',
          email: '',
          avatarUrl: '',
        };

        const managerId = employee.managerId;
        if (managerId) {
          const [manager] = await this.db
            .select({
              id: employees.id,
              firstName: employees.firstName,
              lastName: employees.lastName,
              email: employees.email,
              avatarUrl: users.avatar,
            })
            .from(employees)
            .innerJoin(users, eq(employees.userId, users.id))
            .where(eq(employees.id, managerId))
            .execute();

          if (manager) {
            employeeManager = {
              id: manager.id,
              firstName: manager.firstName,
              lastName: manager.lastName,
              email: manager.email,
              avatarUrl: manager.avatarUrl || '',
            };
          }
        } else {
          const superAdminUserId = await this.findSuperAdminUser(companyId);
          const [superAdmin] = await this.db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              avatarUrl: users.avatar,
            })
            .from(users)
            .where(eq(users.id, superAdminUserId))
            .execute();

          if (superAdmin) {
            employeeManager = {
              id: superAdmin.id,
              firstName: superAdmin.firstName ?? '',
              lastName: superAdmin.lastName ?? '',
              email: superAdmin.email,
              avatarUrl: superAdmin.avatarUrl || '',
            };
          }
        }

        return { ...employee, employeeManager };
      },
      { tags: [`employee:${employeeId}`] },
    );
  }

  async findEmployeeSummaryByUserId(employeeId: string) {
    const [row] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();
    if (!row) throw new NotFoundException('Employee not found.');

    return this.cacheService.getOrSetVersioned(
      row.companyId,
      this.kEmployee(employeeId, 'summary'),
      async () => {
        const [employee] = await this.db
          .select({
            id: employees.id,
            confirmed: employees.confirmed,
            gender: employeeProfiles.gender,
            level: jobRoles.level,
            country: employeeProfiles.country,
            department: departments.name,
            userId: employees.userId,
          })
          .from(employees)
          .innerJoin(departments, eq(employees.departmentId, departments.id))
          .innerJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
          .leftJoin(
            employeeProfiles,
            eq(employees.id, employeeProfiles.employeeId),
          )
          .where(eq(employees.id, employeeId))
          .execute();

        if (!employee) throw new NotFoundException('Employee not found.');
        return employee;
      },
      { tags: [`employee:${employeeId}`] },
    );
  }

  async findManagerByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<string> {
    // manager lookups change with employee updates; no persistent cache here
    const [employee] = await this.db
      .select({ managerId: employees.managerId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();

    if (employee?.managerId) {
      const [manager] = await this.db
        .select({ userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, employee.managerId))
        .execute();

      if (manager?.userId) {
        return manager.userId;
      }
      console.warn(
        'ManagerId exists but user record not found, fallback to super admin.',
      );
    }

    return await this.findSuperAdminUser(companyId);
  }

  async findHrRepresentative(companyId: string): Promise<string> {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['hrRepresentative'],
      async () => {
        const [hr] = await this.db
          .select({ userId: users.id })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(companyRoles.name, 'hr_manager'),
            ),
          )
          .limit(1)
          .execute();

        if (!hr?.userId) {
          throw new NotFoundException('HR representative not found.');
        }
        return hr.userId;
      },
    );
  }

  async findSuperAdminUser(companyId: string): Promise<string> {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['superAdminUserId'],
      async () => {
        const [ceo] = await this.db
          .select({ id: users.id })
          .from(users)
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .where(
            and(
              eq(users.companyId, companyId),
              eq(companyRoles.name, 'super_admin'),
            ),
          )
          .execute();

        if (!ceo) {
          throw new NotFoundException('CEO user not found.');
        }
        return ceo.id;
      },
    );
  }

  async update(
    employeeId: string,
    dto: EmployeeProfileDto,
    userId: string,
    ip: string,
  ) {
    const [employee] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.id, employeeId))
      .execute();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [updated] = await this.db
      .update(this.table)
      .set({
        employmentStatus: dto.employmentStatus as any,
        departmentId: dto.departmentId,
        jobRoleId: dto.jobRoleId,
        locationId: dto.locationId,
        payGroupId: dto.payGroupId,
        employmentStartDate: dto.employmentStartDate,
        confirmed: dto.confirmed,
        costCenterId: dto.costCenterId,
      })
      .where(eq(this.table.id, employeeId))
      .returning()
      .execute();

    if (dto.companyRoleId) {
      await this.db
        .update(users)
        .set({ companyRoleId: dto.companyRoleId })
        .where(eq(users.id, employee.userId))
        .execute();
    }

    const changes: Record<string, any> = {};
    for (const key of Object.keys(dto)) {
      const before = (employee as any)[key];
      const after = (dto as any)[key];
      if (before !== after) changes[key] = { before, after };
    }
    if (Object.keys(changes).length) {
      await this.audit.logAction({
        action: 'update',
        entity: 'Employee',
        details: 'Employee updated',
        userId,
        entityId: employeeId,
        ipAddress: ip,
        changes,
      });
    }

    // 🔄 invalidate company caches
    await this.cacheService.bumpCompanyVersion(employee.companyId);
    await this.cacheService.invalidateTags([
      `employee:${employeeId}`,
      'employees:list',
      'employees:summary',
    ]);

    return updated;
  }

  async remove(employeeId: string) {
    const [emp] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)
      .execute();

    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.id, employeeId))
      .returning({ id: this.table.id })
      .execute();

    if (!result.length) {
      throw new NotFoundException(`employee ${employeeId} not found`);
    }

    if (emp?.companyId) {
      await this.cacheService.bumpCompanyVersion(emp.companyId);
      await this.cacheService.invalidateTags([
        `employee:${employeeId}`,
        'employees:list',
        'employees:summary',
      ]);
    }

    return { deleted: true, id: result[0].id };
  }

  async buildTemplateWorkbook(companyId: string): Promise<Workbook> {
    // caching the lists improves template generation speed
    const [depts, roles, centers] = await Promise.all([
      this.cacheService.getOrSetVersioned(
        companyId,
        ['lists', 'departments'],
        () => this.deptSvc.findAll(companyId),
        { tags: ['lists:departments'] },
      ),
      this.cacheService.getOrSetVersioned(
        companyId,
        ['lists', 'roles'],
        () => this.roleSvc.findAll(companyId),
        { tags: ['lists:roles'] },
      ),
      this.cacheService.getOrSetVersioned(
        companyId,
        ['lists', 'costCenters'],
        () => this.ccSvc.findAll(companyId),
        { tags: ['lists:costCenters'] },
      ),
    ]);

    const wb = new Workbook();
    const sheet = wb.addWorksheet('Employees');

    sheet.columns = [
      { header: 'Employee Number', key: 'employeeNumber', width: 30 },
      { header: 'First Name', key: 'firstName', width: 30 },
      { header: 'Last Name', key: 'lastName', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 30 },
      { header: 'Job Role', key: 'jobRole', width: 30 },
      { header: 'Cost Center', key: 'costCenter', width: 30 },
      { header: 'Employment Status', key: 'employmentStatus', width: 30 },
      { header: 'Bank Name', key: 'bankName', width: 30 },
      { header: 'Bank Account Number', key: 'bankAccount', width: 30 },
      { header: 'Bank Branch', key: 'bankBranch', width: 30 },
      { header: 'Currency', key: 'currency', width: 30 },
      { header: 'TIN', key: 'tin', width: 30 },
      { header: 'Pension Pin', key: 'pensionPin', width: 30 },
      { header: 'NHF Number', key: 'nhfNumber', width: 30 },
      { header: 'Effective Date', key: 'effectiveDate', width: 30 },
      { header: 'Gross Salary', key: 'grossSalary', width: 30 },
      { header: 'Pay Frequency', key: 'payFrequency', width: 30 },
    ];

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const listSheet = wb.addWorksheet('Lists', { state: 'hidden' });
    listSheet.columns = [
      { header: 'Departments', key: 'dept', width: 30 },
      { header: 'Roles', key: 'role', width: 30 },
      { header: 'Cost Centers', key: 'cc', width: 30 },
    ];

    depts.forEach((d, i) => (listSheet.getCell(`A${i + 2}`).value = d.name));
    roles.forEach((r, i) => (listSheet.getCell(`B${i + 2}`).value = r.title));
    centers.forEach((c, i) => (listSheet.getCell(`C${i + 2}`).value = c.name));

    const maxRows = 1000;
    const deptRange = depts.length ? `Lists!$A$2:$A$${depts.length + 1}` : null;
    const roleRange = roles.length ? `Lists!$B$2:$B$${roles.length + 1}` : null;
    const ccRange = centers.length
      ? `Lists!$C$2:$C$${centers.length + 1}`
      : null;

    for (let row = 2; row <= maxRows; row++) {
      if (deptRange) {
        sheet.getCell(`E${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [deptRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Department',
        };
      }
      if (roleRange) {
        sheet.getCell(`F${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [roleRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Job Role',
        };
      }
      if (ccRange) {
        sheet.getCell(`G${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [ccRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Cost Center',
        };
      }
    }

    return wb;
  }

  async bulkCreate(user: User, rows: any[]) {
    const { companyId } = user;

    const roleNameMap = new Map<string, string>([
      ['HR Manager', 'hr_manager'],
      ['HR Assistant', 'hr_assistant'],
      ['Recruiter', 'recruiter'],
      ['Payroll Specialist', 'payroll_specialist'],
      ['Benefits Admin', 'benefits_admin'],
      ['Finance Manager', 'finance_manager'],
      ['Admin', 'admin'],
      ['Employee', 'employee'],
      ['Manager', 'manager'],
    ]);

    const [allDepts, allRoles, allCenters, allLocations, allPayGroups] =
      await Promise.all([
        this.db
          .select({ id: departments.id, name: departments.name })
          .from(departments)
          .where(eq(departments.companyId, companyId))
          .execute(),
        this.db
          .select({ id: jobRoles.id, title: jobRoles.title })
          .from(jobRoles)
          .where(eq(jobRoles.companyId, companyId))
          .execute(),
        this.db
          .select({ id: costCenters.id, name: costCenters.name })
          .from(costCenters)
          .where(eq(costCenters.companyId, companyId))
          .execute(),
        this.db
          .select({ id: companyLocations.id, name: companyLocations.name })
          .from(companyLocations)
          .where(eq(companyLocations.companyId, companyId))
          .execute(),
        this.db
          .select({ id: payGroups.id, name: payGroups.name })
          .from(payGroups)
          .where(eq(payGroups.companyId, companyId))
          .execute(),
      ]);

    const roles = await this.permissionService.getRolesByCompany(companyId);

    const companyRoleMap = new Map(roles.map((r) => [r.name, r.id]));
    const deptMap = new Map(allDepts.map((d) => [d.name, d.id]));
    const roleMap = new Map(allRoles.map((r) => [r.title, r.id]));
    const centerMap = new Map(allCenters.map((c) => [c.name, c.id]));
    const locationMap = new Map(allLocations.map((l) => [l.name, l.id]));
    const groupMap = new Map(
      allPayGroups.map((g) => [g.name.toLowerCase(), g.id]),
    );

    const empNums = rows.map((r) => r['Employee Number']?.trim());
    const emails = rows.map((r) => r['Email']?.trim().toLowerCase());
    const managerEmailMap = new Map<string, string>();
    const roleMapFromCSV = new Map<string, string>();

    const dupes = await this.db
      .select({ number: employees.employeeNumber, email: employees.email })
      .from(employees)
      .where(
        and(
          eq(employees.companyId, companyId),
          or(
            inArray(employees.employeeNumber, empNums),
            inArray(employees.email, emails),
          ),
        ),
      )
      .execute();

    if (dupes.length) {
      throw new BadRequestException(
        `These employees already exist: ` +
          dupes.map((d) => `${d.number}/${d.email}`).join(', '),
      );
    }

    type ImportRow = {
      empDto: CreateEmployeeCoreDto;
      finDto: CreateFinanceDto;
      compDto: CreateCompensationDto;
    };
    const imports: ImportRow[] = [];
    const failedRows: any[] = [];

    const normalizedRoleMap = new Map(
      Array.from(roleNameMap.entries()).map(([label, key]) => [
        label.trim().toLowerCase(),
        key,
      ]),
    );

    for (const [index, row] of rows.entries()) {
      try {
        const email = row['Email']?.trim().toLowerCase();
        const managerEmail = row['Manager Email']?.trim()?.toLowerCase() || '';
        const rawRole = row['Role']?.trim().toLowerCase();

        const role = normalizedRoleMap.get(rawRole) ?? 'employee';

        if (!normalizedRoleMap.has(rawRole)) {
          console.warn(
            `Unknown role in CSV: "${row['Role']}" — defaulting to 'employee'`,
          );
        }

        if (!role) {
          const allowed = Array.from(roleNameMap.keys()).join(', ');
          throw new BadRequestException(
            `Invalid role "${row['Role']}". Allowed roles are: ${allowed}`,
          );
        }
        if (managerEmail && email === managerEmail) {
          throw new BadRequestException(
            'An employee cannot be their own manager.',
          );
        }

        if (managerEmail) {
          managerEmailMap.set(email, managerEmail);
        }
        roleMapFromCSV.set(email, role);

        const departmentId = deptMap.get(row['Department']?.trim() ?? '');
        const jobRoleId = roleMap.get(row['Job Role']?.trim() ?? '');
        const costCenterId = centerMap.get(row['Cost Center']?.trim() ?? '');
        const locationId = locationMap.get(row['Location']?.trim() ?? '');
        const payGroupName = row['Pay Group']?.trim().toLowerCase() ?? '';
        const payGroupId = groupMap.get(payGroupName);

        if (!payGroupId) {
          throw new BadRequestException(`Unknown Pay Group “${payGroupName}”`);
        }

        const today = new Date();

        const rawDate = row['Effective Date'];
        const rawProbationDate = row['Probation End Date'];

        function excelSerialToDate(serial: string): string | null {
          const excelEpoch = new Date(1899, 11, 30);
          const days = parseInt(serial, 10);

          if (isNaN(days)) {
            const parsed = new Date(serial);
            if (isNaN(parsed.getTime())) return null;
            return parsed.toISOString().split('T')[0];
          }

          const date = new Date(excelEpoch.getTime() + days * 86400000);
          return date.toISOString().split('T')[0];
        }

        const empDto = plainToInstance(CreateEmployeeCoreDto, {
          employeeNumber: row['Employee Number']?.trim(),
          departmentId,
          jobRoleId,
          costCenterId: costCenterId ?? null,
          employmentStatus: row['Employment Status']?.trim(),
          firstName: row['First Name']?.trim(),
          lastName: row['Last Name']?.trim(),
          confirmed: row['Confirmed']?.toLowerCase() === 'yes' ? true : false,
          probationEndDate: excelSerialToDate(rawProbationDate) ?? today,
          email,
          companyId,
          locationId,
          payGroupId,
          employmentStartDate: excelSerialToDate(rawDate) ?? today,
        });

        const finDto = plainToInstance(CreateFinanceDto, {
          bankName: row['Bank Name']?.trim(),
          bankAccountNumber: row['Bank Account Number']?.toString().trim(),
          bankBranch: row['Bank Branch']?.toString().trim(),
          bankAccountName: `${row['First Name']?.trim()} ${row['Last Name']?.trim()}`,
          tin: row['TIN']?.toString().trim(),
          pensionPin: row['Pension PIN']?.toString().trim(),
          nhfNumber: row['NHF Number']?.toString().trim(),
        });

        const compDto = plainToInstance(CreateCompensationDto, {
          effectiveDate: excelSerialToDate(row['Effective Date']),
          grossSalary: parseInt(
            row['Gross Salary']?.toString().trim() ?? '0',
            10,
          ),
          currency: row['Currency'] ? row['Currency'].trim() : 'NGN',
          payFrequency: row['Pay Frequency']
            ? row['Pay Frequency'].trim()
            : 'Monthly',
        });

        await validateOrReject(empDto);
        await validateOrReject(finDto);
        await validateOrReject(compDto);

        imports.push({ empDto, finDto, compDto });
      } catch (error) {
        failedRows.push({
          rowIndex: index + 1,
          employeeNumber: row['Employee Number'],
          email: row['Email'],
          error: Array.isArray(error)
            ? error.map((e) => e.toString()).join('; ')
            : (error as Error).message,
        });
      }
    }

    if (imports.length === 0) {
      return {
        successCount: 0,
        failedCount: failedRows.length,
        failedRows,
        created: [],
      };
    }

    const fallbackManagerUserId = await this.resolveFallbackManager(companyId);

    const result = await this.db.transaction(async (trx) => {
      const plainPasswords = imports.map(() => randomBytes(12).toString('hex'));
      const hashedPasswords = await Promise.all(
        plainPasswords.map((pw) => bcrypt.hash(pw, 6)),
      );

      const userValues = imports.map(({ empDto }, idx) => ({
        email: empDto.email.toLowerCase(),
        firstName: empDto.firstName,
        lastName: empDto.lastName,
        password: hashedPasswords[idx],
        companyRoleId: companyRoleMap.get(
          roleMapFromCSV.get(empDto.email.toLowerCase()) ?? 'employee',
        )!,
        companyId,
      }));

      const createdUsers = await trx
        .insert(users)
        .values(userValues)
        .returning({ id: users.id, email: users.email })
        .execute();

      const userIdMap = new Map(createdUsers.map((u) => [u.email, u.id]));

      const empValues = imports.map(({ empDto }) => ({
        ...empDto,
        userId: userIdMap.get(empDto.email.toLowerCase())!,
        companyId,
        employmentStatus: empDto.employmentStatus as any,
      }));

      const createdEmps = await trx
        .insert(employees)
        .values(empValues)
        .returning({
          id: employees.id,
          employeeNumber: employees.employeeNumber,
          email: employees.email,
        })
        .execute();

      const empEmailIdMap = new Map<string, string>();
      createdEmps.forEach((e, i) => {
        empEmailIdMap.set(userValues[i].email, e.id);
      });

      function hasCircularReference(
        empEmail: string,
        visited = new Set<string>(),
      ): boolean {
        let current = empEmail;
        while (managerEmailMap.has(current)) {
          const manager = managerEmailMap.get(current)!;
          if (manager === empEmail || visited.has(manager)) return true;
          visited.add(manager);
          current = manager;
        }
        return false;
      }

      for (const [email] of managerEmailMap.entries()) {
        if (hasCircularReference(email)) {
          throw new BadRequestException(
            `Circular reference detected for ${email}`,
          );
        }
      }

      for (const [empEmail, mgrEmail] of managerEmailMap.entries()) {
        const empId = empEmailIdMap.get(empEmail);
        const mgrId = empEmailIdMap.get(mgrEmail);
        if (empId) {
          const resolvedMgrId = mgrId ?? fallbackManagerUserId;
          if (resolvedMgrId) {
            await trx
              .update(employees)
              .set({ managerId: resolvedMgrId })
              .where(eq(employees.id, empId))
              .execute();
          }
        }
      }

      const finValues = createdEmps.map((e, i) => ({
        employeeId: e.id,
        ...imports[i].finDto,
      }));

      await trx.insert(employeeFinancials).values(finValues).execute();

      const compValues = createdEmps.map((e, i) => ({
        employeeId: e.id,
        ...imports[i].compDto,
      }));

      await trx
        .insert(employeeCompensations)
        .values(
          compValues.map((comp) => ({
            ...comp,
            grossSalary: comp.grossSalary,
          })),
        )
        .execute();

      await this.companySettingsService.setSetting(
        user.companyId,
        'onboarding_upload_employees',
        true,
      );

      return createdEmps;
    });

    // 🔄 company-wide invalidation
    await this.cacheService.bumpCompanyVersion(companyId);
    await this.cacheService.invalidateTags([
      'employees:list',
      'employees:summary',
    ]);

    return {
      successCount: result.length,
      failedCount: failedRows.length,
      failedRows,
      created: result,
    };
  }

  async getManagers(companyId: string) {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['managers'],
      async () => {
        return this.db
          .select({
            id: employees.id,
            name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .where(
            and(
              eq(employees.companyId, companyId),
              eq(companyRoles.name, 'manager'),
            ),
          )
          .execute();
      },
      { tags: ['employees:managers'] },
    );
  }

  async assignManager(employeeId: string, managerId: string) {
    const [employee] = await this.db
      .select({ companyId: employees.companyId })
      .from(this.table)
      .where(eq(this.table.id, employeeId))
      .execute();

    if (!employee) throw new NotFoundException('Employee not found');

    const [updated] = await this.db
      .update(this.table)
      .set({ managerId })
      .where(eq(this.table.id, employeeId))
      .returning()
      .execute();

    await this.cacheService.bumpCompanyVersion(employee.companyId);
    await this.cacheService.invalidateTags([`employee:${employeeId}`]);

    return updated;
  }

  async removeManager(employeeId: string) {
    const [employee] = await this.db
      .select({ companyId: employees.companyId })
      .from(this.table)
      .where(eq(this.table.id, employeeId))
      .execute();
    if (!employee) throw new NotFoundException('Employee not found');

    const [updated] = await this.db
      .update(this.table)
      .set({ managerId: null })
      .where(eq(this.table.id, employeeId))
      .returning()
      .execute();

    await this.cacheService.bumpCompanyVersion(employee.companyId);
    await this.cacheService.invalidateTags([`employee:${employeeId}`]);

    return updated;
  }

  async findFallbackManagers(companyId: string) {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['fallbackManagers'],
      async () => {
        return this.db
          .select({
            id: employees.id,
            name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            role: companyRoles.name,
            email: users.email,
          })
          .from(employees)
          .innerJoin(users, eq(employees.userId, users.id))
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .where(
            and(
              eq(users.companyId, companyId),
              ne(companyRoles.name, 'employee'),
            ),
          )
          .execute();
      },
      { tags: ['employees:fallbackManagers'] },
    );
  }

  async resolveFallbackManager(companyId: string): Promise<string | null> {
    return this.cacheService.getOrSetVersioned(
      companyId,
      ['settings', 'defaultManager'],
      async () => {
        const fallback =
          await this.companySettingsService.getDefaultManager(companyId);
        if (fallback?.defaultManager) {
          return fallback.defaultManager;
        }

        const [superAdmin] = await this.db
          .select({ id: users.id })
          .from(users)
          .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
          .where(
            and(
              eq(users.companyId, companyId),
              eq(companyRoles.name, 'super_admin'),
            ),
          )
          .limit(1)
          .execute();

        return superAdmin?.id ?? null;
      },
      { tags: ['settings'] },
    );
  }

  // Search is ad-hoc (many combinations). Prefer no cache or short TTL if needed.
  async search(dto: SearchEmployeesDto) {
    const {
      search,
      departmentId,
      jobRoleId,
      costCenterId,
      status,
      locationId,
    } = dto;

    const maybeClauses = [
      search &&
        or(
          ilike(employees.firstName, `%${search}%`),
          ilike(employees.lastName, `%${search}%`),
        ),
      departmentId && eq(employees.departmentId, departmentId),
      jobRoleId && eq(employees.jobRoleId, jobRoleId),
      costCenterId && eq(employees.costCenterId, costCenterId),
      status && eq(employees.employmentStatus, status),
      locationId && eq(employees.locationId, locationId),
    ];

    const clauses = maybeClauses.filter((c): c is SQL => Boolean(c));

    return this.db
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        employmentStatus: employees.employmentStatus,
        departmentName: departments.name,
        jobRoleTitle: jobRoles.title,
        costCenterName: costCenters.name,
        locationName: companyLocations.name,
      })
      .from(employees)
      .leftJoin(companyLocations, eq(employees.locationId, companyLocations.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(costCenters, eq(employees.costCenterId, costCenters.id))
      .where(clauses.length ? and(...clauses.filter(Boolean)) : undefined)
      .execute();
  }

  async getEmployeeAttendanceByMonth(
    employeeId: string,
    companyId: string,
    yearMonth: string,
  ): Promise<{
    summaryList: Array<{
      date: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: 'absent' | 'present' | 'late';
    }>;
  }> {
    // No caching here because it composes per-day status + settings + shifts
    const [y, m] = yearMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m - 1, new Date(y, m, 0).getDate());

    const startOfMonth = new Date(start);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(end);
    endOfMonth.setHours(23, 59, 59, 999);

    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfMonth),
          lte(attendanceRecords.clockIn, endOfMonth),
        ),
      )
      .execute();

    const map = new Map<string, (typeof recs)[0]>();
    for (const r of recs) {
      const day = r.clockIn.toISOString().split('T')[0];
      map.set(day, r);
    }

    const allDays = eachDayOfInterval({ start, end }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const days = allDays.filter((dateKey) => dateKey <= todayStr);
    const summaryList = await Promise.all(
      days.map(async (dateKey) => {
        const day = await this.getEmployeeAttendanceByDate(
          employeeId,
          companyId,
          dateKey,
        );
        return {
          date: dateKey,
          checkInTime: day.checkInTime,
          checkOutTime: day.checkOutTime,
          status: day.status,
        };
      }),
    );

    return { summaryList };
  }

  async getEmployeeAttendanceByDate(
    employeeId: string,
    companyId: string,
    date: string,
  ): Promise<{
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: 'absent' | 'present' | 'late';
    workDurationMinutes: number | null;
    overtimeMinutes: number;
    isLateArrival: boolean;
    isEarlyDeparture: boolean;
  }> {
    const target = new Date(date).toISOString().split('T')[0];
    const startOfDay = new Date(`${target}T00:00:00.000Z`);
    const endOfDay = new Date(`${target}T23:59:59.999Z`);

    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    const useShifts = s['use_shifts'] ?? false;
    const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);

    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfDay),
          lte(attendanceRecords.clockIn, endOfDay),
        ),
      )
      .execute();

    const rec = recs[0] ?? null;
    if (!rec) {
      return {
        date: target,
        checkInTime: null,
        checkOutTime: null,
        status: 'absent',
        workDurationMinutes: null,
        overtimeMinutes: 0,
        isLateArrival: false,
        isEarlyDeparture: false,
      };
    }

    let startTimeStr = defaultStartTimeStr;
    let tolerance = lateToleranceMins;
    if (useShifts) {
      const shift = await this.employeeShiftsService.getActiveShiftForEmployee(
        employeeId,
        companyId,
        target,
      );
      if (shift) {
        startTimeStr = shift.startTime;
        tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
      }
    }

    const shiftStart = parseISO(`${target}T${startTimeStr}:00`);
    const checkIn = new Date(rec.clockIn);
    const checkOut = rec.clockOut ? new Date(rec.clockOut) : null;
    const diffLate = (checkIn.getTime() - shiftStart.getTime()) / 60000;

    const isLateArrival = diffLate > tolerance;
    const isEarlyDeparture = checkOut
      ? checkOut.getTime() <
        parseISO(
          `${target}T${
            (
              useShifts &&
              (await this.employeeShiftsService.getActiveShiftForEmployee(
                employeeId,
                companyId,
                target,
              ))
            )?.end_time ??
            s['default_end_time'] ??
            '17:00'
          }:00`,
        ).getTime()
      : false;

    const workDurationMinutes = rec.workDurationMinutes;
    const overtimeMinutes = rec.overtimeMinutes ?? 0;

    return {
      date: target,
      checkInTime: checkIn.toTimeString().slice(0, 8),
      checkOutTime: checkOut?.toTimeString().slice(0, 8) ?? null,
      status: checkIn ? (isLateArrival ? 'late' : 'present') : 'absent',
      workDurationMinutes,
      overtimeMinutes,
      isLateArrival,
      isEarlyDeparture,
    };
  }

  async findAllLeaveRequestByEmployeeId(employeeId: string, companyId: string) {
    // leave requests can be cached per employee; bust on version bump
    return this.cacheService.getOrSetVersioned(
      companyId,
      this.kEmployee(employeeId, 'leaveRequests'),
      async () => {
        const leaveRequestsData = await this.db
          .select({
            requestId: leaveRequests.id,
            employeeId: leaveRequests.employeeId,
            leaveType: leaveTypes.name,
            startDate: leaveRequests.startDate,
            endDate: leaveRequests.endDate,
            status: leaveRequests.status,
            reason: leaveRequests.reason,
          })
          .from(leaveRequests)
          .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
          .where(
            and(
              eq(leaveRequests.employeeId, employeeId),
              eq(leaveRequests.companyId, companyId),
            ),
          )
          .execute();

        if (!leaveRequestsData) {
          throw new NotFoundException('Leave requests not found');
        }

        return leaveRequestsData;
      },
      { tags: [`employee:${employeeId}`] },
    );
  }
}
