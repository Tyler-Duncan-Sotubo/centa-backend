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
var EmployeesBulkImportWriteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesBulkImportWriteService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const jwt = require("jsonwebtoken");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const crypto_1 = require("crypto");
const bcrypt = require("bcryptjs");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const schema_1 = require("../../../drizzle/schema");
const create_employee_core_dto_1 = require("./dto/create-employee-core.dto");
const create_finance_dto_1 = require("./finance/dto/create-finance.dto");
const create_compensation_dto_1 = require("./compensation/dto/create-compensation.dto");
const permissions_service_1 = require("../../auth/permissions/permissions.service");
const pay_groups_schema_1 = require("../../payroll/schema/pay-groups.schema");
const compensation_schema_1 = require("./schema/compensation.schema");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
let EmployeesBulkImportWriteService = EmployeesBulkImportWriteService_1 = class EmployeesBulkImportWriteService {
    constructor(db, permissionService, companySettingsService, cacheService, emailQueue, config) {
        this.db = db;
        this.permissionService = permissionService;
        this.companySettingsService = companySettingsService;
        this.cacheService = cacheService;
        this.emailQueue = emailQueue;
        this.config = config;
        this.logger = new common_1.Logger(EmployeesBulkImportWriteService_1.name);
    }
    generateToken(payload) {
        const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
        return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
    }
    async bulkCreate(user, rows) {
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
            throw new common_1.BadRequestException('No rows provided.');
        }
        const tRefs0 = Date.now();
        const [allDepts, allRoles, allLocations, allPayGroups] = await Promise.all([
            this.db
                .select({ id: schema_1.departments.id, name: schema_1.departments.name })
                .from(schema_1.departments)
                .where((0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId))
                .execute(),
            this.db
                .select({ id: schema_1.jobRoles.id, title: schema_1.jobRoles.title })
                .from(schema_1.jobRoles)
                .where((0, drizzle_orm_1.eq)(schema_1.jobRoles.companyId, companyId))
                .execute(),
            this.db
                .select({ id: schema_1.companyLocations.id, name: schema_1.companyLocations.name })
                .from(schema_1.companyLocations)
                .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, companyId))
                .execute(),
            this.db
                .select({ id: pay_groups_schema_1.payGroups.id, name: pay_groups_schema_1.payGroups.name })
                .from(pay_groups_schema_1.payGroups)
                .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.companyId, companyId))
                .execute(),
        ]);
        const permissionRoles = await this.permissionService.getRolesByCompany(companyId);
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
        const payGroupMap = new Map(allPayGroups.map((g) => [this.norm(g.name), g.id]));
        const companyRoleMap = new Map(permissionRoles.map((r) => [this.norm(r.name), r.id]));
        const managingDirectorJobRoleId = jobRoleMap.get(this.norm('Managing Director'));
        if (!managingDirectorJobRoleId) {
            throw new common_1.BadRequestException('Missing Job Role "Managing Director". Create it first before importing employees.');
        }
        this.throwIfCsvInternalDuplicates(rows);
        const empNums = rows
            .map((r) => this.asString(r['Employee Number']))
            .filter(Boolean);
        const emails = rows
            .map((r) => this.asString(r['Email'])?.toLowerCase())
            .filter(Boolean);
        if (!empNums.length || !emails.length) {
            throw new common_1.BadRequestException('CSV must include Employee Number and Email.');
        }
        const [existingUsers, existingEmpsByEmail, existingEmpsByEmpNo] = await Promise.all([
            this.db
                .select({ id: schema_1.users.id, email: schema_1.users.email })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.users.email, emails)))
                .execute(),
            this.db
                .select({
                id: schema_1.employees.id,
                email: schema_1.employees.email,
                employeeNumber: schema_1.employees.employeeNumber,
                userId: schema_1.employees.userId,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.email, emails)))
                .execute(),
            this.db
                .select({
                id: schema_1.employees.id,
                email: schema_1.employees.email,
                employeeNumber: schema_1.employees.employeeNumber,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.employeeNumber, empNums)))
                .execute(),
        ]);
        const existingUserIdByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u.id]));
        const existingEmpByEmail = new Map(existingEmpsByEmail.map((e) => [e.email.toLowerCase(), e]));
        const empNoOwnerByEmpNo = new Map(existingEmpsByEmpNo.map((e) => [e.employeeNumber, e.email.toLowerCase()]));
        rows.forEach((r, idx) => {
            const rowIndex = idx + 1;
            const email = this.asString(r['Email'])?.toLowerCase();
            const empNo = this.asString(r['Employee Number']);
            if (!email || !empNo)
                return;
            const ownerEmail = empNoOwnerByEmpNo.get(empNo);
            if (ownerEmail && ownerEmail !== email) {
                throw new common_1.BadRequestException(`Employee Number "${empNo}" is already assigned to ${ownerEmail} (row ${rowIndex}).`);
            }
        });
        const imports = [];
        const failedRows = [];
        const warnings = [];
        const hodByDepartment = new Map();
        for (const [index, row] of rows.entries()) {
            const rowIndex = index + 1;
            try {
                const email = this.asString(row['Email'])?.toLowerCase();
                const employeeNumber = this.asString(row['Employee Number']);
                if (!email)
                    throw new common_1.BadRequestException('Email is required');
                if (!employeeNumber)
                    throw new common_1.BadRequestException('Employee Number is required');
                const managerEmailRaw = this.asString(row['Manager Email'])?.toLowerCase() ?? null;
                if (managerEmailRaw && managerEmailRaw === email) {
                    throw new common_1.BadRequestException('An employee cannot be their own manager.');
                }
                const isHoDRaw = this.asString(row['Is Head of Department'])?.toLowerCase() ?? 'no';
                if (!['yes', 'no', 'true', 'false'].includes(isHoDRaw)) {
                    throw new common_1.BadRequestException('Is Head of Department must be Yes or No');
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
                    throw new common_1.BadRequestException(`Unknown Department "${depName}"`);
                if (!jobRoleId)
                    throw new common_1.BadRequestException(`Unknown Job Role "${jobRoleTitle}"`);
                if (!locationId)
                    throw new common_1.BadRequestException(`Unknown Location "${locName}"`);
                if (!payGroupId)
                    throw new common_1.BadRequestException(`Unknown Pay Group "${pgName}"`);
                if (isHeadOfDepartment) {
                    if (hodByDepartment.has(departmentId)) {
                        throw new common_1.BadRequestException('Multiple Heads of Department specified for the same department.');
                    }
                    hodByDepartment.set(departmentId, email);
                }
                const employmentStartDate = this.parseExcelOrDate(row['Effective Date']);
                if (!employmentStartDate)
                    throw new common_1.BadRequestException('Invalid Effective Date');
                const confirmedRaw = this.asString(row['Confirmed'])?.toLowerCase();
                if (!confirmedRaw)
                    throw new common_1.BadRequestException('Confirmed is required (Yes/No)');
                const confirmed = confirmedRaw === 'yes' || confirmedRaw === 'true';
                const empDto = (0, class_transformer_1.plainToInstance)(create_employee_core_dto_1.CreateEmployeeCoreDto, {
                    employeeNumber,
                    departmentId,
                    jobRoleId,
                    employmentStatus: this.mapEmploymentStatus(this.asString(row['Employment Status'])),
                    firstName: this.asString(row['First Name']),
                    lastName: this.asString(row['Last Name']),
                    confirmed,
                    email,
                    companyId,
                    locationId,
                    payGroupId,
                    employmentStartDate: employmentStartDate.toISOString(),
                });
                const finDto = (0, class_transformer_1.plainToInstance)(create_finance_dto_1.CreateFinanceDto, {});
                const grossSalaryRaw = this.asString(row['Gross Salary']);
                if (!grossSalaryRaw)
                    throw new common_1.BadRequestException('Gross Salary is required');
                const grossSalaryCleaned = grossSalaryRaw.replace(/[^0-9.-]/g, '');
                const grossSalary = Number(grossSalaryCleaned);
                if (!Number.isFinite(grossSalary)) {
                    throw new common_1.BadRequestException(`Invalid Gross Salary "${grossSalaryRaw}"`);
                }
                if (grossSalary < 0) {
                    throw new common_1.BadRequestException('Gross Salary cannot be negative');
                }
                const compDto = (0, class_transformer_1.plainToInstance)(create_compensation_dto_1.CreateCompensationDto, {
                    effectiveDate: employmentStartDate.toISOString(),
                    grossSalary,
                    currency: 'NGN',
                    payFrequency: 'Monthly',
                });
                const errors = await this.validate3(empDto, finDto, compDto);
                if (errors.length) {
                    throw new common_1.BadRequestException(this.formatValidationErrors(errors));
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
            }
            catch (err) {
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
            throw new common_1.BadRequestException({
                message: `All rows failed validation. Example error (row ${firstError.rowIndex}): ${firstError.error}`,
                failedRows,
            });
        }
        const importsToUpdateEmp = imports.filter((i) => existingEmpByEmail.has(i.email));
        const importsToInsert = imports.filter((i) => !existingEmpByEmail.has(i.email));
        const importsToCreateUsers = importsToInsert.filter((i) => !existingUserIdByEmail.has(i.email));
        const plainPasswords = importsToCreateUsers.map(() => (0, crypto_1.randomBytes)(12).toString('hex'));
        const hashedPasswords = await Promise.all(plainPasswords.map((pw) => bcrypt.hash(pw, 6)));
        const result = await this.db.transaction(async (trx) => {
            const createdUsers = await trx
                .insert(schema_1.users)
                .values(importsToCreateUsers.map((i, idx) => ({
                email: i.email,
                firstName: i.empDto.firstName,
                lastName: i.empDto.lastName,
                password: hashedPasswords[idx],
                companyRoleId: companyRoleMap.get(this.norm(i.companyRoleKey)) ??
                    companyRoleMap.get('employee'),
                companyId,
            })))
                .returning({ id: schema_1.users.id, email: schema_1.users.email })
                .execute();
            const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
            await trx.insert(schema_1.PasswordResetToken).values(inviteTokens).execute();
            const userIdByEmail = new Map(existingUserIdByEmail);
            createdUsers.forEach((u) => userIdByEmail.set(u.email.toLowerCase(), u.id));
            const createdEmps = await trx
                .insert(schema_1.employees)
                .values(imports.map((i) => ({
                ...i.empDto,
                userId: userIdByEmail.get(i.email),
                companyId,
                employmentStatus: i.empDto.employmentStatus,
            })))
                .returning({ id: schema_1.employees.id, email: schema_1.employees.email })
                .execute();
            for (const i of importsToUpdateEmp) {
                const existing = existingEmpByEmail.get(i.email);
                const uid = userIdByEmail.get(i.email) ?? existing.userId;
                await trx
                    .update(schema_1.employees)
                    .set({
                    employeeNumber: i.empDto.employeeNumber,
                    departmentId: i.empDto.departmentId,
                    jobRoleId: i.empDto.jobRoleId,
                    locationId: i.empDto.locationId,
                    payGroupId: i.empDto.payGroupId,
                    employmentStatus: i.empDto.employmentStatus,
                    employmentStartDate: i.empDto.employmentStartDate,
                    confirmed: i.confirmed,
                    firstName: i.empDto.firstName,
                    lastName: i.empDto.lastName,
                    userId: uid,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.employees.id, existing.id))
                    .execute();
                const newRoleId = companyRoleMap.get(this.norm(i.companyRoleKey)) ??
                    companyRoleMap.get('employee');
                await trx
                    .update(schema_1.users)
                    .set({ companyRoleId: newRoleId })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.users.email, i.email)))
                    .execute();
            }
            const createdEmpIdByEmail = new Map(createdEmps.map((e) => [e.email.toLowerCase(), e.id]));
            for (const [email, emp] of existingEmpByEmail.entries()) {
                createdEmpIdByEmail.set(email, emp.id);
            }
            for (const [departmentId, email] of hodByDepartment.entries()) {
                const employeeId = createdEmpIdByEmail.get(email.toLowerCase());
                if (!employeeId)
                    continue;
                await trx
                    .update(schema_1.departments)
                    .set({ headId: employeeId })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.departments.id, departmentId), (0, drizzle_orm_1.eq)(schema_1.departments.companyId, companyId)))
                    .execute();
            }
            const mdFromImport = this.resolveManagingDirectorEmployeeIdFromImport(imports, createdEmpIdByEmail, managingDirectorJobRoleId);
            const mdFromDb = await this.resolveManagingDirectorEmployeeIdFromDb(trx, companyId, managingDirectorJobRoleId);
            const defaultManagerEmployeeId = mdFromImport ?? mdFromDb;
            if (!defaultManagerEmployeeId) {
                throw new common_1.BadRequestException('No Managing Director employee found to use as the default manager.');
            }
            const managerEmailSet = new Set(imports.map((i) => i.managerEmail).filter(Boolean));
            const existingMgrs = managerEmailSet.size
                ? await trx
                    .select({ id: schema_1.employees.id, email: schema_1.employees.email })
                    .from(schema_1.employees)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.employees.email, [...managerEmailSet])))
                    .execute()
                : [];
            const existingEmpIdByEmail = new Map(existingMgrs.map((m) => [m.email.toLowerCase(), m.id]));
            const managerEmailMap = new Map();
            for (const i of imports) {
                if (i.managerEmail)
                    managerEmailMap.set(i.email.toLowerCase(), i.managerEmail);
            }
            this.assertNoCircularManagerChains(companyId, managerEmailMap);
            for (const imp of imports) {
                const empId = createdEmpIdByEmail.get(imp.email.toLowerCase());
                if (!empId)
                    continue;
                let managerId = null;
                if (imp.managerEmail) {
                    managerId =
                        createdEmpIdByEmail.get(imp.managerEmail) ??
                            existingEmpIdByEmail.get(imp.managerEmail) ??
                            defaultManagerEmployeeId;
                }
                await trx
                    .update(schema_1.employees)
                    .set({ managerId })
                    .where((0, drizzle_orm_1.eq)(schema_1.employees.id, empId))
                    .execute();
            }
            await trx
                .insert(schema_1.employeeFinancials)
                .values(createdEmps.map((e, i) => ({
                employeeId: e.id,
                ...imports[i].finDto,
            })))
                .execute();
            await trx
                .insert(compensation_schema_1.employeeCompensations)
                .values(createdEmps.map((e, i) => ({
                employeeId: e.id,
                ...imports[i].compDto,
            })))
                .execute();
            await this.companySettingsService.setOnboardingTask(companyId, 'employees', 'upload_employees', 'done');
            return { createdEmps, createdUsers, inviteTokens };
        });
        try {
            await this.cacheService.bumpCompanyVersion(companyId);
            await this.cacheService.invalidateTags([
                'employees:list',
                'employees:summary',
            ]);
        }
        catch { }
        const [{ name: companyName }] = await this.db
            .select({ name: schema_1.companies.name })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .execute();
        const tokenByUserId = new Map(result.inviteTokens.map((t) => [t.user_id, t.token]));
        const firstNameByEmail = new Map(imports.map((i) => [i.email.toLowerCase(), i.empDto.firstName]));
        const baseUrl = this.config.get('EMPLOYEE_PORTAL_URL');
        await Promise.all(result.createdUsers.map((u) => {
            const token = tokenByUserId.get(u.id);
            if (!token)
                return Promise.resolve();
            const resetLink = `${baseUrl}/auth/reset-password/${token}`;
            return this.emailQueue.add('sendPasswordResetEmail', {
                email: u.email,
                name: firstNameByEmail.get(u.email.toLowerCase()) ?? '',
                companyName,
                role: 'Employee',
                resetLink,
            }, {
                attempts: 5,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true,
                removeOnFail: false,
            });
        }));
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
    norm(v) {
        return v.trim().replace(/\s+/g, ' ').toLowerCase();
    }
    asString(v) {
        if (v === undefined || v === null)
            return undefined;
        const s = String(v).trim();
        return s.length ? s : undefined;
    }
    makeLookup(rows, getKey) {
        const m = new Map();
        for (const r of rows) {
            m.set(this.norm(getKey(r) ?? ''), r.id);
        }
        return m;
    }
    throwIfCsvInternalDuplicates(rows) {
        const emailToRow = new Map();
        const empNoToRow = new Map();
        const dupes = [];
        rows.forEach((r, idx) => {
            const rowIndex = idx + 1;
            const email = this.asString(r['Email'])?.toLowerCase();
            const empNo = this.asString(r['Employee Number']);
            if (email) {
                if (emailToRow.has(email)) {
                    dupes.push(`Duplicate Email "${email}" (rows ${emailToRow.get(email)} & ${rowIndex})`);
                }
                else {
                    emailToRow.set(email, rowIndex);
                }
            }
            if (empNo) {
                if (empNoToRow.has(empNo)) {
                    dupes.push(`Duplicate Employee Number "${empNo}" (rows ${empNoToRow.get(empNo)} & ${rowIndex})`);
                }
                else {
                    empNoToRow.set(empNo, rowIndex);
                }
            }
        });
        if (dupes.length)
            throw new common_1.BadRequestException(dupes.join('; '));
    }
    mapCompanyRole(rawRoleLower) {
        const map = new Map([
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
            ['super admin', 'super_admin'],
            ['super_admin', 'super_admin'],
            ['ceo', 'admin'],
            ['managing director', 'admin'],
            ['md', 'admin'],
        ]);
        const key = map.get(this.norm(rawRoleLower));
        return key ?? 'employee';
    }
    parseExcelOrDate(value) {
        if (value === undefined || value === null)
            return null;
        const asNum = Number(String(value).trim());
        if (!Number.isNaN(asNum) && Number.isFinite(asNum) && asNum > 0) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const ms = excelEpoch.getTime() + asNum * 86400000;
            const d = new Date(ms);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(String(value).trim());
        return Number.isNaN(d.getTime()) ? null : d;
    }
    async validate3(a, b, c) {
        const errors = [];
        errors.push(...(await (0, class_validator_1.validate)(a, { whitelist: true, forbidNonWhitelisted: false })));
        errors.push(...(await (0, class_validator_1.validate)(b, { whitelist: true, forbidNonWhitelisted: false })));
        errors.push(...(await (0, class_validator_1.validate)(c, { whitelist: true, forbidNonWhitelisted: false })));
        return errors;
    }
    formatValidationErrors(errors) {
        return errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
            children: e.children?.length ? e.children : undefined,
        }));
    }
    assertNoCircularManagerChains(companyId, mgrMap) {
        function hasCycle(start) {
            let cur = start;
            const visited = new Set();
            while (mgrMap.has(cur)) {
                const mgr = mgrMap.get(cur);
                if (mgr === start || visited.has(mgr))
                    return true;
                visited.add(mgr);
                cur = mgr;
            }
            return false;
        }
        for (const [email] of mgrMap.entries()) {
            if (hasCycle(email)) {
                throw new common_1.BadRequestException(`Circular reference detected for ${email}`);
            }
        }
    }
    async resolveManagingDirectorEmployeeIdFromDb(trx, companyId, managingDirectorJobRoleId) {
        const [row] = await trx
            .select({ id: schema_1.employees.id })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, managingDirectorJobRoleId)))
            .execute();
        return row?.id ?? null;
    }
    resolveManagingDirectorEmployeeIdFromImport(imports, createdEmpIdByEmail, managingDirectorJobRoleId) {
        const md = imports.find((i) => i.empDto.jobRoleId === managingDirectorJobRoleId &&
            this.norm(i.companyRoleKey) === 'admin');
        if (!md)
            return null;
        return createdEmpIdByEmail.get(md.email.toLowerCase()) ?? null;
    }
    mapEmploymentStatus(raw) {
        return this.norm(raw ?? '');
    }
};
exports.EmployeesBulkImportWriteService = EmployeesBulkImportWriteService;
exports.EmployeesBulkImportWriteService = EmployeesBulkImportWriteService = EmployeesBulkImportWriteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(4, (0, bullmq_2.InjectQueue)('emailQueue')),
    __metadata("design:paramtypes", [Object, permissions_service_1.PermissionsService,
        company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService,
        bullmq_1.Queue,
        config_1.ConfigService])
], EmployeesBulkImportWriteService);
//# sourceMappingURL=employees-bulk-import-write.service.js.map