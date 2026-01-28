// src/modules/core/employees/services/employees-bulk-import-write.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import {
  companyLocations,
  departments,
  employees,
  employeeFinancials,
  jobRoles,
  users,
  PasswordResetToken,
  companies,
} from 'src/drizzle/schema';
import { CreateEmployeeCoreDto } from './dto/create-employee-core.dto';
import { CreateFinanceDto } from './finance/dto/create-finance.dto';
import { CreateCompensationDto } from './compensation/dto/create-compensation.dto';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { payGroups } from 'src/modules/payroll/schema/pay-groups.schema';
import { User } from 'src/common/types/user.type';
import { employeeCompensations } from './schema/compensation.schema';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

type Row = Record<string, any>;

type ImportRow = {
  rowIndex: number; // 1-based
  empDto: CreateEmployeeCoreDto;
  finDto: CreateFinanceDto;
  compDto: CreateCompensationDto;
  email: string;
  managerEmail: string | null;
  companyRoleKey: string; // e.g. 'employee', 'manager', 'admin'...
  isHeadOfDepartment: boolean;
  confirmed: boolean;
};

type FailedRow = {
  rowIndex: number;
  employeeNumber?: string;
  email?: string;
  error: string;
};

@Injectable()
export class EmployeesBulkImportWriteService {
  private readonly logger = new Logger(EmployeesBulkImportWriteService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly permissionService: PermissionsService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly cacheService: CacheService,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue, // ✅ add
    private readonly config: ConfigService, // if you don't already have it here
  ) {}

  private generateToken(payload: any): string {
    const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
    return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
  }
  /**
   * Bulk create employees + users (+ finance + compensation) from CSV rows.
   * - Collects failed rows (skips them), imports valid rows in one transaction.
   * - Manager resolution:
   *    - If Manager Email is blank => default to Managing Director (employee)
   *    - If provided => resolve to employee created in this import, else existing employee in DB, else Managing Director
   *
   * IMPORTANT: "super_admin" can be a SaaS owner and may NOT have an employee record.
   * So we DO NOT use super_admin for org hierarchy defaults.
   */
  async bulkCreate(user: User, rows: Row[]) {
    const t0 = Date.now();
    const companyId = user.companyId;

    this.logger.log({
      op: 'employees.bulkCreate.start',
      companyId,
      rowsCount: Array.isArray(rows) ? rows.length : 0,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      this.logger.warn({
        op: 'employees.bulkCreate.noRows',
        companyId,
      });
      throw new BadRequestException('No rows provided.');
    }

    // --- 0) Load reference data
    const tRefs0 = Date.now();
    const [allDepts, allRoles, allLocations, allPayGroups] = await Promise.all([
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

    const permissionRoles =
      await this.permissionService.getRolesByCompany(companyId);

    this.logger.warn({
      op: 'employees.bulkCreate.refsLoaded',
      companyId,
      ms: Date.now() - tRefs0,
      departments: allDepts.length,
      jobRoles: allRoles.length,
      locations: allLocations.length,
      payGroups: allPayGroups.length,
      permissionRoles: permissionRoles.length,
    });

    const deptMap = this.makeLookup(allDepts, (d) => d.name);
    const jobRoleMap = this.makeLookup(allRoles, (r) => r.title);
    const locationMap = this.makeLookup(allLocations, (l) => l.name);
    const payGroupMap = new Map(
      allPayGroups.map((g) => [this.norm(g.name), g.id]),
    );
    const companyRoleMap = new Map(
      permissionRoles.map((r) => [this.norm(r.name), r.id]),
    );

    const managingDirectorJobRoleId = jobRoleMap.get(
      this.norm('Managing Director'),
    );
    if (!managingDirectorJobRoleId) {
      throw new BadRequestException(
        'Missing Job Role "Managing Director". Create it first before importing employees.',
      );
    }

    // --- 1) CSV internal duplicates
    this.throwIfCsvInternalDuplicates(rows);

    // --- 2) DB duplicates
    const empNums = rows
      .map((r) => this.asString(r['Employee Number']))
      .filter(Boolean) as string[];

    const emails = rows
      .map((r) => this.asString(r['Email'])?.toLowerCase())
      .filter(Boolean) as string[];

    if (!empNums.length || !emails.length) {
      throw new BadRequestException(
        'CSV must include Employee Number and Email.',
      );
    }

    // ✅ NEW: preload existing users/employees for incremental import
    const [existingUsers, existingEmpsByEmail, existingEmpsByEmpNo] =
      await Promise.all([
        this.db
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(
            and(eq(users.companyId, companyId), inArray(users.email, emails)),
          )
          .execute(),

        this.db
          .select({
            id: employees.id,
            email: employees.email,
            employeeNumber: employees.employeeNumber,
            userId: employees.userId,
          })
          .from(employees)
          .where(
            and(
              eq(employees.companyId, companyId),
              inArray(employees.email, emails),
            ),
          )
          .execute(),

        this.db
          .select({
            id: employees.id,
            email: employees.email,
            employeeNumber: employees.employeeNumber,
          })
          .from(employees)
          .where(
            and(
              eq(employees.companyId, companyId),
              inArray(employees.employeeNumber, empNums),
            ),
          )
          .execute(),
      ]);

    const existingUserIdByEmail = new Map(
      existingUsers.map((u) => [u.email.toLowerCase(), u.id]),
    );

    const existingEmpByEmail = new Map(
      existingEmpsByEmail.map((e) => [e.email.toLowerCase(), e]),
    );

    // ✅ Allow same email (update path), but block employeeNumber reused by another email
    const empNoOwnerByEmpNo = new Map(
      existingEmpsByEmpNo.map((e) => [e.employeeNumber, e.email.toLowerCase()]),
    );

    rows.forEach((r, idx) => {
      const rowIndex = idx + 1;
      const email = this.asString(r['Email'])?.toLowerCase();
      const empNo = this.asString(r['Employee Number']);

      if (!email || !empNo) return;

      const ownerEmail = empNoOwnerByEmpNo.get(empNo);
      if (ownerEmail && ownerEmail !== email) {
        throw new BadRequestException(
          `Employee Number "${empNo}" is already assigned to ${ownerEmail} (row ${rowIndex}).`,
        );
      }
    });

    // --- 3) Parse + validate rows
    const imports: ImportRow[] = [];
    const failedRows: FailedRow[] = [];
    const warnings: Array<{
      rowIndex: number;
      field: string;
      message: string;
    }> = [];

    // ✅ HoD tracking (PATCH)
    const hodByDepartment = new Map<string, string>();

    for (const [index, row] of rows.entries()) {
      const rowIndex = index + 1;

      try {
        const email = this.asString(row['Email'])?.toLowerCase();
        const employeeNumber = this.asString(row['Employee Number']);
        if (!email) throw new BadRequestException('Email is required');
        if (!employeeNumber)
          throw new BadRequestException('Employee Number is required');

        const managerEmailRaw =
          this.asString(row['Manager Email'])?.toLowerCase() ?? null;

        if (managerEmailRaw && managerEmailRaw === email) {
          throw new BadRequestException(
            'An employee cannot be their own manager.',
          );
        }

        // ✅ HoD flag (PATCH)
        const isHoDRaw =
          this.asString(row['Is Head of Department'])?.toLowerCase() ?? 'no';
        if (!['yes', 'no', 'true', 'false'].includes(isHoDRaw)) {
          throw new BadRequestException(
            'Is Head of Department must be Yes or No',
          );
        }
        const isHeadOfDepartment = isHoDRaw === 'yes' || isHoDRaw === 'true';

        const rawRole = this.asString(row['Role'])?.toLowerCase() ?? '';
        const companyRoleKey = this.mapCompanyRole(rawRole);

        const depName = this.asString(row['Department']) ?? '';
        const jobRoleTitle = this.asString(row['Job Role']) ?? '';
        const locName = this.asString(row['Location']) ?? '';
        const pgName = this.asString(row['Pay Group']) ?? '';

        const departmentId = deptMap.get(this.norm(depName));
        const jobRoleId = jobRoleMap.get(this.norm(jobRoleTitle));
        const locationId = locationMap.get(this.norm(locName));
        const payGroupId = payGroupMap.get(this.norm(pgName));

        if (!departmentId)
          throw new BadRequestException(`Unknown Department "${depName}"`);
        if (!jobRoleId)
          throw new BadRequestException(`Unknown Job Role "${jobRoleTitle}"`);
        if (!locationId)
          throw new BadRequestException(`Unknown Location "${locName}"`);
        if (!payGroupId)
          throw new BadRequestException(`Unknown Pay Group "${pgName}"`);

        // ✅ Enforce one HoD per department (PATCH)
        if (isHeadOfDepartment) {
          if (hodByDepartment.has(departmentId)) {
            throw new BadRequestException(
              'Multiple Heads of Department specified for the same department.',
            );
          }
          hodByDepartment.set(departmentId, email);
        }

        const employmentStartDate = this.parseExcelOrDate(
          row['Effective Date'],
        );
        if (!employmentStartDate)
          throw new BadRequestException('Invalid Effective Date');

        const confirmedRaw = this.asString(row['Confirmed'])?.toLowerCase();
        if (!confirmedRaw)
          throw new BadRequestException('Confirmed is required (Yes/No)');
        const confirmed = confirmedRaw === 'yes' || confirmedRaw === 'true';

        const empDto = plainToInstance(CreateEmployeeCoreDto, {
          employeeNumber,
          departmentId,
          jobRoleId,
          employmentStatus: this.mapEmploymentStatus(
            this.asString(row['Employment Status']),
          ),
          firstName: this.asString(row['First Name']),
          lastName: this.asString(row['Last Name']),
          confirmed,
          email,
          companyId,
          locationId,
          payGroupId,
          employmentStartDate: employmentStartDate.toISOString(),
        });

        const finDto = plainToInstance(CreateFinanceDto, {});

        // ✅ NEW: parse gross salary from CSV (ONLY change)
        const grossSalaryRaw = this.asString(row['Gross Salary']);
        if (!grossSalaryRaw)
          throw new BadRequestException('Gross Salary is required');

        // allow values like "5,000,000" or "₦5,000,000"
        const grossSalaryCleaned = grossSalaryRaw.replace(/[^0-9.-]/g, '');
        const grossSalary = Number(grossSalaryCleaned);
        if (!Number.isFinite(grossSalary)) {
          throw new BadRequestException(
            `Invalid Gross Salary "${grossSalaryRaw}"`,
          );
        }
        if (grossSalary < 0) {
          throw new BadRequestException('Gross Salary cannot be negative');
        }

        const compDto = plainToInstance(CreateCompensationDto, {
          effectiveDate: employmentStartDate.toISOString(),
          grossSalary,
          currency: 'NGN',
          payFrequency: 'Monthly',
        });

        const errors = await this.validate3(empDto, finDto, compDto);
        if (errors.length) {
          throw new BadRequestException(this.formatValidationErrors(errors));
        }

        imports.push({
          rowIndex,
          empDto,
          finDto,
          compDto,
          email,
          managerEmail: managerEmailRaw,
          companyRoleKey,
          isHeadOfDepartment,
          confirmed,
        });
      } catch (err: any) {
        failedRows.push({
          rowIndex,
          employeeNumber: this.asString(row['Employee Number']),
          email: this.asString(row['Email']),
          error: err.message,
        });
      }
    }

    if (!imports.length) {
      console.log('ALL ROWS FAILED:', failedRows);

      const firstError = failedRows[0];

      throw new BadRequestException({
        message: `All rows failed validation. Example error (row ${firstError.rowIndex}): ${firstError.error}`,
        failedRows,
      });
    }

    const importsToUpdateEmp = imports.filter((i) =>
      existingEmpByEmail.has(i.email),
    );

    const importsToInsert = imports.filter(
      (i) => !existingEmpByEmail.has(i.email),
    );

    // only create users for new employees without users
    const importsToCreateUsers = importsToInsert.filter(
      (i) => !existingUserIdByEmail.has(i.email),
    );

    // --- 4) Passwords
    const plainPasswords = importsToCreateUsers.map(() =>
      randomBytes(12).toString('hex'),
    );
    const hashedPasswords = await Promise.all(
      plainPasswords.map((pw) => bcrypt.hash(pw, 6)),
    );

    // --- 5) Transaction
    const result = await this.db.transaction(async (trx) => {
      // users
      const createdUsers = await trx
        .insert(users)
        .values(
          importsToCreateUsers.map((i, idx) => ({
            email: i.email,
            firstName: i.empDto.firstName,
            lastName: i.empDto.lastName,
            password: hashedPasswords[idx],
            companyRoleId:
              companyRoleMap.get(this.norm(i.companyRoleKey)) ??
              companyRoleMap.get('employee')!,
            companyId,
          })),
        )
        .returning({ id: users.id, email: users.email })
        .execute();

      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

      const inviteTokens = createdUsers.map((u) => ({
        user_id: u.id,
        token: this.generateToken({
          sub: u.id,
          email: u.email,
          type: 'password_reset',
        }),
        expires_at,
        is_used: false,
      }));
      await trx.insert(PasswordResetToken).values(inviteTokens).execute();

      const userIdByEmail = new Map(existingUserIdByEmail);
      createdUsers.forEach((u) =>
        userIdByEmail.set(u.email.toLowerCase(), u.id),
      );

      // employees
      const createdEmps = await trx
        .insert(employees)
        .values(
          imports.map((i) => ({
            ...i.empDto,
            userId: userIdByEmail.get(i.email)!,
            companyId,
            employmentStatus: i.empDto.employmentStatus as any,
          })),
        )
        .returning({ id: employees.id, email: employees.email })
        .execute();

      for (const i of importsToUpdateEmp) {
        const existing = existingEmpByEmail.get(i.email)!;
        const uid = userIdByEmail.get(i.email) ?? existing.userId;

        await trx
          .update(employees)
          .set({
            employeeNumber: i.empDto.employeeNumber,
            departmentId: i.empDto.departmentId,
            jobRoleId: i.empDto.jobRoleId,
            locationId: i.empDto.locationId,
            payGroupId: i.empDto.payGroupId,
            employmentStatus: i.empDto.employmentStatus as any,
            employmentStartDate: i.empDto.employmentStartDate,
            confirmed: i.confirmed,
            firstName: i.empDto.firstName,
            lastName: i.empDto.lastName,
            userId: uid,
            updatedAt: new Date(),
          })
          .where(eq(employees.id, existing.id))
          .execute();

        // optional: sync user role from CSV
        const newRoleId =
          companyRoleMap.get(this.norm(i.companyRoleKey)) ??
          companyRoleMap.get('employee')!;

        await trx
          .update(users)
          .set({ companyRoleId: newRoleId })
          .where(and(eq(users.companyId, companyId), eq(users.email, i.email)))
          .execute();
      }

      const createdEmpIdByEmail = new Map(
        createdEmps.map((e) => [e.email.toLowerCase(), e.id]),
      );

      for (const [email, emp] of existingEmpByEmail.entries()) {
        createdEmpIdByEmail.set(email, emp.id);
      }

      // ✅ Assign Heads of Department (PATCH)
      for (const [departmentId, email] of hodByDepartment.entries()) {
        const employeeId = createdEmpIdByEmail.get(email.toLowerCase());
        if (!employeeId) continue;

        await trx
          .update(departments)
          .set({ headId: employeeId })
          .where(
            and(
              eq(departments.id, departmentId),
              eq(departments.companyId, companyId),
            ),
          )
          .execute();
      }

      // --- manager resolution (UNCHANGED)
      const mdFromImport = this.resolveManagingDirectorEmployeeIdFromImport(
        imports,
        createdEmpIdByEmail,
        managingDirectorJobRoleId,
      );
      const mdFromDb = await this.resolveManagingDirectorEmployeeIdFromDb(
        trx,
        companyId,
        managingDirectorJobRoleId,
      );
      const defaultManagerEmployeeId = mdFromImport ?? mdFromDb;

      if (!defaultManagerEmployeeId) {
        throw new BadRequestException(
          'No Managing Director employee found to use as the default manager.',
        );
      }

      const managerEmailSet = new Set(
        imports.map((i) => i.managerEmail).filter(Boolean) as string[],
      );

      const existingMgrs = managerEmailSet.size
        ? await trx
            .select({ id: employees.id, email: employees.email })
            .from(employees)
            .where(
              and(
                eq(employees.companyId, companyId),
                inArray(employees.email, [...managerEmailSet]),
              ),
            )
            .execute()
        : [];

      const existingEmpIdByEmail = new Map(
        existingMgrs.map((m) => [m.email.toLowerCase(), m.id]),
      );

      const managerEmailMap = new Map<string, string>();
      for (const i of imports) {
        if (i.managerEmail)
          managerEmailMap.set(i.email.toLowerCase(), i.managerEmail);
      }
      this.assertNoCircularManagerChains(companyId, managerEmailMap);

      for (const imp of imports) {
        const empId = createdEmpIdByEmail.get(imp.email.toLowerCase());
        if (!empId) continue;

        let managerId: string | null = null;

        if (imp.managerEmail) {
          // explicit manager always wins
          managerId =
            createdEmpIdByEmail.get(imp.managerEmail) ??
            existingEmpIdByEmail.get(imp.managerEmail) ??
            defaultManagerEmployeeId;
        }
        // else: no manager email → ROOT (managerId stays null)

        await trx
          .update(employees)
          .set({ managerId })
          .where(eq(employees.id, empId))
          .execute();
      }

      // finance + compensation
      await trx
        .insert(employeeFinancials)
        .values(
          createdEmps.map((e, i) => ({
            employeeId: e.id,
            ...imports[i].finDto,
          })),
        )
        .execute();

      await trx
        .insert(employeeCompensations)
        .values(
          createdEmps.map((e, i) => ({
            employeeId: e.id,
            ...imports[i].compDto,
          })),
        )
        .execute();

      await this.companySettingsService.setOnboardingTask(
        companyId,
        'employees',
        'upload_employees',
        'done',
      );

      return { createdEmps, createdUsers, inviteTokens };
    });

    try {
      await this.cacheService.bumpCompanyVersion(companyId);
      await this.cacheService.invalidateTags([
        'employees:list',
        'employees:summary',
      ]);
    } catch {}

    const [{ name: companyName }] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    const tokenByUserId = new Map(
      result.inviteTokens.map((t) => [t.user_id, t.token]),
    );

    // map first name by email from imports
    const firstNameByEmail = new Map(
      imports.map((i) => [i.email.toLowerCase(), i.empDto.firstName]),
    );

    const baseUrl = this.config.get('EMPLOYEE_PORTAL_URL');

    await Promise.all(
      result.createdUsers.map((u) => {
        const token = tokenByUserId.get(u.id);
        if (!token) return Promise.resolve();

        const resetLink = `${baseUrl}/auth/reset-password/${token}`;

        return this.emailQueue.add(
          'sendPasswordResetEmail',
          {
            email: u.email,
            name: firstNameByEmail.get(u.email.toLowerCase()) ?? '',
            companyName,
            role: 'Employee',
            resetLink,
          },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      }),
    );

    return {
      successCount: result.createdEmps.length,
      failedCount: failedRows.length,
      failedRows,
      warnings,
      created: result,
      inviteTokens: result.inviteTokens,
      durationMs: Date.now() - t0,
    };
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private norm(v: string) {
    return v.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private asString(v: any): string | undefined {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s.length ? s : undefined;
  }

  private makeLookup<T extends Record<string, any>>(
    rows: T[],
    getKey: (row: T) => string,
  ) {
    const m = new Map<string, string>();
    for (const r of rows) {
      m.set(this.norm(getKey(r) ?? ''), r.id);
    }
    return m;
  }

  private throwIfCsvInternalDuplicates(rows: Row[]) {
    const emailToRow = new Map<string, number>();
    const empNoToRow = new Map<string, number>();
    const dupes: string[] = [];

    rows.forEach((r, idx) => {
      const rowIndex = idx + 1;
      const email = this.asString(r['Email'])?.toLowerCase();
      const empNo = this.asString(r['Employee Number']);

      if (email) {
        if (emailToRow.has(email)) {
          dupes.push(
            `Duplicate Email "${email}" (rows ${emailToRow.get(email)} & ${rowIndex})`,
          );
        } else {
          emailToRow.set(email, rowIndex);
        }
      }

      if (empNo) {
        if (empNoToRow.has(empNo)) {
          dupes.push(
            `Duplicate Employee Number "${empNo}" (rows ${empNoToRow.get(empNo)} & ${rowIndex})`,
          );
        } else {
          empNoToRow.set(empNo, rowIndex);
        }
      }
    });

    if (dupes.length) throw new BadRequestException(dupes.join('; '));
  }

  private mapCompanyRole(rawRoleLower: string) {
    // CSV Role → internal key used to match permission role names (normalized)
    // Unknown => employee
    const map = new Map<string, string>([
      ['hr manager', 'hr_manager'],
      ['hr assistant', 'hr_assistant'],
      ['recruiter', 'recruiter'],
      ['payroll specialist', 'payroll_specialist'],
      ['benefits admin', 'benefits_admin'],
      ['finance manager', 'finance_manager'],
      ['finance officer', 'finance_officer'],
      ['admin', 'admin'],
      ['manager', 'manager'],
      ['employee', 'employee'],
      // Keep super_admin mapping available (company owner account), but DO NOT use it for manager fallback:
      ['super admin', 'super_admin'],
      ['super_admin', 'super_admin'],
      // CEO/MD labels should map to ADMIN (per your decision):
      ['ceo', 'admin'],
      ['managing director', 'admin'],
      ['md', 'admin'],
    ]);

    const key = map.get(this.norm(rawRoleLower));
    return key ?? 'employee';
  }

  private parseExcelOrDate(value: any): Date | null {
    if (value === undefined || value === null) return null;

    // Excel serial date
    const asNum = Number(String(value).trim());
    if (!Number.isNaN(asNum) && Number.isFinite(asNum) && asNum > 0) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = excelEpoch.getTime() + asNum * 86400000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // Date string
    const d = new Date(String(value).trim());
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private async validate3(a: any, b: any, c: any) {
    const errors: ValidationError[] = [];
    errors.push(
      ...(await validate(a, { whitelist: true, forbidNonWhitelisted: false })),
    );
    errors.push(
      ...(await validate(b, { whitelist: true, forbidNonWhitelisted: false })),
    );
    errors.push(
      ...(await validate(c, { whitelist: true, forbidNonWhitelisted: false })),
    );
    return errors;
  }

  private formatValidationErrors(errors: ValidationError[]) {
    return errors.map((e) => ({
      property: e.property,
      constraints: e.constraints,
      children: e.children?.length ? e.children : undefined,
    }));
  }

  private assertNoCircularManagerChains(
    companyId: string,
    mgrMap: Map<string, string>,
  ) {
    function hasCycle(start: string) {
      let cur = start;
      const visited = new Set<string>();
      while (mgrMap.has(cur)) {
        const mgr = mgrMap.get(cur)!;
        if (mgr === start || visited.has(mgr)) return true;
        visited.add(mgr);
        cur = mgr;
      }
      return false;
    }

    for (const [email] of mgrMap.entries()) {
      if (hasCycle(email)) {
        throw new BadRequestException(
          `Circular reference detected for ${email}`,
        );
      }
    }
  }

  /**
   * Find an existing Managing Director employee in DB by jobRoleId.
   * We intentionally do NOT rely on super_admin users.
   */
  private async resolveManagingDirectorEmployeeIdFromDb(
    trx: db,
    companyId: string,
    managingDirectorJobRoleId: string,
  ): Promise<string | null> {
    const [row] = await trx
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employees.jobRoleId, managingDirectorJobRoleId),
        ),
      )
      .execute();

    return row?.id ?? null;
  }

  /**
   * Find Managing Director employee created during THIS import.
   * We look through imports -> find the MD jobRoleId, then map that email to created employee id.
   */
  private resolveManagingDirectorEmployeeIdFromImport(
    imports: ImportRow[],
    createdEmpIdByEmail: Map<string, string>,
    managingDirectorJobRoleId: string,
  ): string | null {
    const md = imports.find(
      (i) =>
        i.empDto.jobRoleId === managingDirectorJobRoleId &&
        this.norm(i.companyRoleKey) === 'admin',
    );

    if (!md) return null;
    return createdEmpIdByEmail.get(md.email.toLowerCase()) ?? null;
  }

  private mapEmploymentStatus(raw?: string): string {
    return this.norm(raw ?? '');
  }
}
