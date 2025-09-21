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
var EmployeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const jwt = require("jsonwebtoken");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const employee_sequences_schema_1 = require("./schema/employee-sequences.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_2 = require("../../../drizzle/schema");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const profile_service_1 = require("./profile/profile.service");
const history_service_1 = require("./history/history.service");
const dependents_service_1 = require("./dependents/dependents.service");
const certifications_service_1 = require("./certifications/certifications.service");
const compensation_service_1 = require("./compensation/compensation.service");
const finance_service_1 = require("./finance/finance.service");
const exceljs_1 = require("exceljs");
const department_service_1 = require("../department/department.service");
const job_roles_service_1 = require("../job-roles/job-roles.service");
const cost_centers_service_1 = require("../cost-centers/cost-centers.service");
const compensation_schema_1 = require("./schema/compensation.schema");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_compensation_dto_1 = require("./compensation/dto/create-compensation.dto");
const create_finance_dto_1 = require("./finance/dto/create-finance.dto");
const create_employee_core_dto_1 = require("./dto/create-employee-core.dto");
const groups_service_1 = require("./groups/groups.service");
const config_1 = require("@nestjs/config");
const employee_invitation_service_1 = require("../../notification/services/employee-invitation.service");
const cache_service_1 = require("../../../common/cache/cache.service");
const pay_groups_schema_1 = require("../../payroll/schema/pay-groups.schema");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const permissions_service_1 = require("../../auth/permissions/permissions.service");
const leave_balance_service_1 = require("../../leave/balance/leave-balance.service");
const date_fns_1 = require("date-fns");
const attendance_settings_service_1 = require("../../time/settings/attendance-settings.service");
const employee_shifts_service_1 = require("../../time/employee-shifts/employee-shifts.service");
const payslip_service_1 = require("../../payroll/payslip/payslip.service");
const leave_requests_schema_1 = require("../../leave/schema/leave-requests.schema");
const leave_types_schema_1 = require("../../leave/schema/leave-types.schema");
const onboarding_service_1 = require("../../lifecycle/onboarding/onboarding.service");
let EmployeesService = EmployeesService_1 = class EmployeesService {
    constructor(db, logger, audit, profileService, historyService, dependentsService, certificationsService, compensationService, financeService, deptSvc, roleSvc, ccSvc, groupsService, config, employeeInvitationService, cacheService, companySettingsService, permissionService, leaveBalanceService, attendanceSettingsService, employeeShiftsService, payslipService, onboardingService) {
        this.db = db;
        this.logger = logger;
        this.audit = audit;
        this.profileService = profileService;
        this.historyService = historyService;
        this.dependentsService = dependentsService;
        this.certificationsService = certificationsService;
        this.compensationService = compensationService;
        this.financeService = financeService;
        this.deptSvc = deptSvc;
        this.roleSvc = roleSvc;
        this.ccSvc = ccSvc;
        this.groupsService = groupsService;
        this.config = config;
        this.employeeInvitationService = employeeInvitationService;
        this.cacheService = cacheService;
        this.companySettingsService = companySettingsService;
        this.permissionService = permissionService;
        this.leaveBalanceService = leaveBalanceService;
        this.attendanceSettingsService = attendanceSettingsService;
        this.employeeShiftsService = employeeShiftsService;
        this.payslipService = payslipService;
        this.onboardingService = onboardingService;
        this.table = schema_1.employees;
        this.logger.setContext(EmployeesService_1.name);
    }
    kCompany(companyId, ...parts) {
        return parts;
    }
    kEmployee(employeeId, ...parts) {
        return ['employee', employeeId, ...parts];
    }
    generateToken(payload) {
        const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
        return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
    }
    async createEmployeeNumber(companyId) {
        const [seqRow] = await this.db
            .select({ next: employee_sequences_schema_1.employeeSequences.nextNumber })
            .from(employee_sequences_schema_1.employeeSequences)
            .where((0, drizzle_orm_1.eq)(employee_sequences_schema_1.employeeSequences.companyId, companyId))
            .execute();
        let seq = 1;
        if (!seqRow) {
            await this.db
                .insert(employee_sequences_schema_1.employeeSequences)
                .values({ companyId, nextNumber: 2 })
                .execute();
        }
        else {
            seq = seqRow.next;
            await this.db
                .update(employee_sequences_schema_1.employeeSequences)
                .set({ nextNumber: seq + 1 })
                .where((0, drizzle_orm_1.eq)(employee_sequences_schema_1.employeeSequences.companyId, companyId))
                .execute();
        }
        return `HR${String(seq).padStart(2, '0')}`;
    }
    async create(dto, currentUser) {
        const { companyId, id } = currentUser;
        const emp = await this.db.transaction(async (trx) => {
            const [seqRow] = await trx
                .select({ next: employee_sequences_schema_1.employeeSequences.nextNumber })
                .from(employee_sequences_schema_1.employeeSequences)
                .where((0, drizzle_orm_1.eq)(employee_sequences_schema_1.employeeSequences.companyId, companyId))
                .execute();
            let seq = 1;
            if (!seqRow) {
                await trx
                    .insert(employee_sequences_schema_1.employeeSequences)
                    .values({ companyId, nextNumber: 2 })
                    .execute();
            }
            else {
                seq = seqRow.next;
                await trx
                    .update(employee_sequences_schema_1.employeeSequences)
                    .set({ nextNumber: seq + 1 })
                    .where((0, drizzle_orm_1.eq)(employee_sequences_schema_1.employeeSequences.companyId, companyId))
                    .execute();
            }
            const empNum = dto.employeeNumber ?? `HR${String(seq).padStart(2, '0')}`;
            const existing = await trx
                .select()
                .from(schema_2.users)
                .where((0, drizzle_orm_1.eq)(schema_2.users.email, dto.email.toLowerCase()))
                .execute();
            if (existing.length)
                throw new common_1.BadRequestException('Email already in use');
            const token = this.generateToken({ email: dto.email });
            const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);
            const [authUser] = await trx
                .insert(schema_2.users)
                .values({
                email: dto.email.toLowerCase(),
                firstName: dto.firstName,
                lastName: dto.lastName,
                password: token,
                companyRoleId: dto.companyRoleId,
                companyId,
            })
                .returning({ id: schema_2.users.id })
                .execute();
            const [emp] = await trx
                .insert(schema_1.employees)
                .values({
                companyId,
                userId: authUser.id,
                employeeNumber: empNum,
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email.toLowerCase(),
                employmentStatus: dto.employmentStatus,
                departmentId: dto.departmentId,
                jobRoleId: dto.jobRoleId,
                costCenterId: dto.costCenterId,
                locationId: dto.locationId,
                payGroupId: dto.payGroupId,
                employmentStartDate: dto.employmentStartDate,
                confirmed: false,
            })
                .returning({
                id: schema_1.employees.id,
                employeeNumber: schema_1.employees.employeeNumber,
                email: schema_1.employees.email,
                firstName: schema_1.employees.firstName,
            })
                .execute();
            await trx
                .insert(schema_2.PasswordResetToken)
                .values({ user_id: authUser.id, token, expires_at, is_used: false })
                .execute();
            const [company] = await trx
                .select({ name: schema_1.companies.name, id: schema_1.companies.id })
                .from(schema_1.companies)
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                .execute();
            if (dto.onboardingTemplateId) {
                await this.onboardingService.assignOnboardingTemplate(emp.id, dto.onboardingTemplateId, company.id, trx);
            }
            if (dto.grossSalary) {
                await this.compensationService.create(emp.id, {
                    grossSalary: dto.grossSalary,
                    currency: 'NGN',
                    effectiveDate: dto.employmentStartDate,
                }, id, 'system', trx);
            }
            const inviteLink = `${this.config.get('EMPLOYEE_PORTAL_URL')}/auth/reset-password/${token}`;
            await this.employeeInvitationService.sendInvitationEmail(emp.email, emp.firstName, company.name, 'Employee', inviteLink);
            await this.companySettingsService.setOnboardingTask(companyId, 'employees', 'upload_employees', 'done');
            return emp;
        });
        await this.cacheService.bumpCompanyVersion(companyId);
        await this.cacheService.invalidateTags([
            'employees:list',
            'employees:summary',
        ]);
        return emp;
    }
    async createEmployee(dto, user, employee_id) {
        let employeeId;
        if (employee_id) {
            employeeId = employee_id;
        }
        else {
            const employee = await this.create(dto, user);
            employeeId = employee.id;
        }
        await this.db.transaction(async (tx) => {
            const hasProfileData = !!dto.dateOfBirth ||
                !!dto.gender ||
                !!dto.maritalStatus ||
                !!dto.address ||
                !!dto.state ||
                !!dto.country ||
                !!dto.emergencyName ||
                !!dto.emergencyPhone;
            if (hasProfileData) {
                await tx.insert(schema_1.employeeProfiles).values({
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
            const hasCompensationData = dto.grossSalary !== undefined || dto.currency !== undefined;
            if (hasCompensationData) {
                await tx.insert(compensation_schema_1.employeeCompensations).values({
                    employeeId,
                    grossSalary: dto.grossSalary,
                    currency: dto.currency,
                    effectiveDate: dto.employmentStartDate,
                });
            }
            const hasFinanceData = dto.bankName !== undefined ||
                dto.bankAccountNumber !== undefined ||
                dto.bankBranch !== undefined ||
                dto.tin !== undefined ||
                dto.pensionPin !== undefined;
            if (hasFinanceData) {
                await tx.insert(schema_1.employeeFinancials).values({
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
            const hasDependentData = !!dto.name || !!dto.relationship || !!dto.dependentDob;
            if (hasDependentData) {
                await tx.insert(schema_1.employeeDependents).values({
                    employeeId,
                    name: dto.name,
                    relationship: dto.relationship,
                    isBeneficiary: dto.isBeneficiary,
                    dateOfBirth: dto.dependentDob.toString(),
                });
            }
        });
        await this.companySettingsService.setOnboardingTask(user.companyId, 'employees', 'upload_employees', 'done');
        await this.cacheService.bumpCompanyVersion(user.companyId);
        await this.cacheService.invalidateTags([
            `employee:${employeeId}`,
            'employees:list',
            'employees:summary',
        ]);
        return employeeId;
    }
    async safe(p) {
        try {
            return await p;
        }
        catch (err) {
            console.error('[employee.findBySections] subcall error:', err);
            return null;
        }
    }
    assign(p, sink) {
        return this.safe(p).then((v) => {
            sink(v);
        });
    }
    async findBySections(employeeId, companyId, sections, month) {
        let targetMonth = month ?? (0, date_fns_1.format)(new Date(), 'yyyy-MM');
        if (month) {
            try {
                const parsed = (0, date_fns_1.parse)(`${month}-01`, 'yyyy-MM-dd', new Date());
                targetMonth = (0, date_fns_1.format)(parsed, 'yyyy-MM');
            }
            catch {
            }
        }
        const wants = (s) => sections.size === 0 ? s === 'core' : sections.has(s);
        let core = null;
        if (wants('core')) {
            core = await this.findOne(employeeId, companyId);
            if (!core)
                throw new common_1.BadRequestException('Employee not found');
        }
        const resp = {};
        if (core) {
            resp.core = core;
            resp.avatarUrl = core?.avatarUrl ?? '';
        }
        const tasks = [];
        if (wants('profile')) {
            tasks.push(this.assign(this.profileService.findOne(employeeId), (v) => {
                resp.profile = v;
            }));
        }
        if (wants('history')) {
            tasks.push(this.assign(this.historyService.findAll(employeeId), (v) => {
                resp.history = v;
            }));
        }
        if (wants('dependents')) {
            tasks.push(this.assign(this.dependentsService.findAll(employeeId), (v) => {
                resp.dependents = v;
            }));
        }
        if (wants('certifications')) {
            tasks.push(this.assign(this.certificationsService.findAll(employeeId), (v) => {
                resp.certifications = v;
            }));
        }
        if (wants('compensation')) {
            tasks.push(this.assign(this.compensationService.findAll(employeeId), (v) => {
                resp.compensation = v;
            }));
        }
        if (wants('finance')) {
            tasks.push(this.assign(this.financeService.findOne(employeeId), (v) => {
                resp.finance = v;
            }));
        }
        if (wants('leave')) {
            tasks.push(this.assign(this.leaveBalanceService.findByEmployeeId(employeeId), (v) => {
                resp.leaveBalance = v;
            }));
            tasks.push(this.assign(this.findAllLeaveRequestByEmployeeId(employeeId, companyId), (v) => {
                resp.leaveRequests = v;
            }));
        }
        if (wants('attendance')) {
            tasks.push(this.assign(this.getEmployeeAttendanceByMonth(employeeId, companyId, targetMonth), (v) => {
                resp.attendance = v;
            }));
        }
        if (wants('payslip')) {
            tasks.push(this.assign(this.payslipService.getEmployeePayslipSummary(employeeId), (v) => {
                resp.payslipSummary = v;
            }));
        }
        await Promise.all(tasks);
        return resp;
    }
    async findAll(employeeId, companyId, month) {
        let targetMonth = month;
        if (!targetMonth) {
            targetMonth = (0, date_fns_1.format)(new Date(), 'yyyy-MM');
        }
        else {
            try {
                const parsed = (0, date_fns_1.parse)(targetMonth + '-01', 'yyyy-MM-dd', new Date());
                targetMonth = (0, date_fns_1.format)(parsed, 'yyyy-MM');
            }
            catch {
            }
        }
        const employee = await this.findOne(employeeId, companyId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        const safe = async (p) => {
            try {
                return await p;
            }
            catch (err) {
                console.error('[employee.findAll] subcall error:', err);
                return null;
            }
        };
        const results = await Promise.allSettled([
            safe(this.financeService.findOne(employeeId)),
            safe(this.profileService.findOne(employeeId)),
            safe(this.historyService.findAll(employeeId)),
            safe(this.dependentsService.findAll(employeeId)),
            safe(this.certificationsService.findAll(employeeId)),
            safe(this.compensationService.findAll(employeeId)),
            safe(this.leaveBalanceService.findByEmployeeId(employeeId)),
            safe(this.findAllLeaveRequestByEmployeeId(employeeId, companyId)),
            safe(this.getEmployeeAttendanceByMonth(employeeId, companyId, targetMonth)),
            safe(this.payslipService.getEmployeePayslipSummary(employeeId)),
        ]);
        const [finance, profile, history, dependents, certifications, compensation, leaveBalance, leaves, attendance, payslipSummary,] = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
        return {
            core: employee,
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
            avatarUrl: employee?.avatarUrl ?? '',
        };
    }
    async getEmployeeByUserId(user_id) {
        const [empRow] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.userId, user_id))
            .limit(1)
            .execute();
        if (!empRow) {
            throw new common_1.BadRequestException('Employee not found, please provide a valid email');
        }
        const companyId = empRow.companyId;
        return this.cacheService.getOrSetVersioned(companyId, ['employeeByUser', user_id], async () => {
            const result = await this.db
                .select({
                first_name: schema_1.employees.firstName,
                last_name: schema_1.employees.lastName,
                avatar: schema_2.users.avatar,
                userId: schema_1.employees.userId,
                email: schema_1.employees.email,
                group_id: schema_1.employees.payGroupId,
                companyId: schema_1.companies.id,
                id: schema_1.employees.id,
                company_name: schema_1.companies.name,
                start_date: schema_1.employees.employmentStartDate,
                department_name: schema_1.departments.name,
                job_role: schema_1.jobRoles.title,
                employee_number: schema_1.employees.employeeNumber,
                managerId: schema_1.employees.managerId,
                location: schema_1.companyLocations.name,
            })
                .from(schema_1.employees)
                .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.companies.id, schema_1.employees.companyId))
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_2.users.id, schema_1.employees.userId))
                .leftJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.companyLocations.id, schema_1.employees.locationId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                .where((0, drizzle_orm_1.eq)(schema_1.employees.userId, user_id))
                .execute();
            if (!result.length) {
                throw new common_1.BadRequestException('Employee not found, please provide a valid email');
            }
            let employeeManager = { id: '', name: '', email: '' };
            const managerId = result[0].managerId;
            if (managerId) {
                const [manager] = await this.db
                    .select({
                    id: schema_1.employees.id,
                    name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                    email: schema_1.employees.email,
                })
                    .from(schema_1.employees)
                    .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
                    .execute();
                if (manager) {
                    employeeManager = {
                        id: manager.id,
                        email: manager.email,
                        name: manager.name || '',
                    };
                }
            }
            else {
                const superAdminUserId = await this.findSuperAdminUser(result[0].companyId);
                const [superAdmin] = await this.db
                    .select({
                    id: schema_2.users.id,
                    name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                    email: schema_2.users.email,
                })
                    .from(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, superAdminUserId))
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
        }, { tags: ['employees:byUser'] });
    }
    async employeeSalaryDetails(user, employeeId) {
        return this.cacheService.getOrSetVersioned(user.companyId, this.kEmployee(employeeId, 'salaryDetails'), async () => {
            const companyAllowance = await this.companySettingsService.getAllowanceConfig(user.companyId);
            const compensations = await this.compensationService.findAll(employeeId);
            return { companyAllowance, compensations };
        }, { tags: [`employee:${employeeId}`] });
    }
    async employeeFinanceDetails(employeeId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Employee not found.');
        return this.cacheService.getOrSetVersioned(row.companyId, this.kEmployee(employeeId, 'finance'), () => this.financeService.findOne(employeeId), { tags: [`employee:${employeeId}`] });
    }
    async findAllEmployees(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, this.kCompany(companyId, 'employees', 'active'), async () => {
            return this.db
                .select({
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                employeeNumber: schema_1.employees.employeeNumber,
                email: schema_1.employees.email,
                departmentId: schema_1.employees.departmentId,
                department: schema_1.departments.name,
                employmentStatus: schema_1.employees.employmentStatus,
                jobRole: schema_1.jobRoles.title,
                costCenter: schema_1.costCenters.name,
                location: schema_1.companyLocations.name,
                annualGross: compensation_schema_1.employeeCompensations.grossSalary,
                groupId: schema_1.employees.payGroupId,
                applyNHf: compensation_schema_1.employeeCompensations.applyNHf,
                role: schema_2.companyRoles.name,
            })
                .from(schema_1.employees)
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .leftJoin(compensation_schema_1.employeeCompensations, (0, drizzle_orm_1.eq)(schema_1.employees.id, compensation_schema_1.employeeCompensations.employeeId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .leftJoin(schema_1.costCenters, (0, drizzle_orm_1.eq)(schema_1.employees.costCenterId, schema_1.costCenters.id))
                .leftJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.employees.locationId, schema_1.companyLocations.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
                .execute();
        }, { tags: ['employees:list'] });
    }
    async findAllCompanyEmployeesSummary(companyId, search) {
        if (!search) {
            return this.cacheService.getOrSetVersioned(companyId, this.kCompany(companyId, 'employees', 'summary', 'top10'), async () => {
                return this.db
                    .select({
                    id: schema_1.employees.id,
                    firstName: schema_1.employees.firstName,
                    lastName: schema_1.employees.lastName,
                    employeeNumber: schema_1.employees.employeeNumber,
                })
                    .from(schema_1.employees)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
                    .limit(10)
                    .execute();
            }, {
                ttlSeconds: 60 * 60 * 12,
                tags: ['employees:summary'],
            });
        }
        const q = search.toLowerCase();
        return this.cacheService.getOrSetVersioned(companyId, this.kCompany(companyId, 'employees', 'summary', 'search', q), async () => {
            return this.db
                .select({
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                employeeNumber: schema_1.employees.employeeNumber,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active'), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.employees.firstName, `%${q}%`), (0, drizzle_orm_1.ilike)(schema_1.employees.lastName, `%${q}%`), (0, drizzle_orm_1.ilike)(schema_1.employees.employeeNumber, `%${q}%`))))
                .limit(10)
                .execute();
        }, {
            ttlSeconds: 60 * 60 * 12,
            tags: ['employees:summary', 'employees:search'],
        });
    }
    async findOneByUserId(userId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.userId, userId))
            .limit(1)
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Employee not found');
        return this.cacheService.getOrSetVersioned(row.companyId, ['employeeCoreByUser', userId], async () => {
            const [employee] = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.eq)(this.table.userId, userId))
                .execute();
            if (!employee)
                throw new common_1.NotFoundException('Employee not found');
            return employee;
        }, { tags: ['employees:byUser'] });
    }
    async findOne(employeeId, companyId) {
        return this.cacheService.getOrSetVersioned(companyId, this.kEmployee(employeeId, 'core'), async () => {
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
                department: schema_1.departments.name,
                jobRoleId: this.table.jobRoleId,
                jobRole: schema_1.jobRoles.title,
                costCenter: schema_1.costCenters.name,
                costCenterId: this.table.costCenterId,
                location: schema_1.companyLocations.name,
                payGroupId: this.table.payGroupId,
                locationId: this.table.locationId,
                payGroup: pay_groups_schema_1.payGroups.name,
                managerId: this.table.managerId,
                avatarUrl: schema_2.users.avatar,
                effectiveDate: this.table.employmentStartDate,
                companyRoleId: schema_2.users.companyRoleId,
                role: schema_2.companyRoles.name,
                confirmed: this.table.confirmed,
            })
                .from(this.table)
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(this.table.userId, schema_2.users.id))
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(this.table.departmentId, schema_1.departments.id))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(this.table.jobRoleId, schema_1.jobRoles.id))
                .leftJoin(schema_1.costCenters, (0, drizzle_orm_1.eq)(this.table.costCenterId, schema_1.costCenters.id))
                .leftJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(this.table.locationId, schema_1.companyLocations.id))
                .leftJoin(pay_groups_schema_1.payGroups, (0, drizzle_orm_1.eq)(this.table.payGroupId, pay_groups_schema_1.payGroups.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.id, employeeId), (0, drizzle_orm_1.eq)(this.table.companyId, companyId)))
                .execute();
            if (!employee)
                throw new common_1.BadRequestException('Employee not found');
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
                    id: schema_1.employees.id,
                    firstName: schema_1.employees.firstName,
                    lastName: schema_1.employees.lastName,
                    email: schema_1.employees.email,
                    avatarUrl: schema_2.users.avatar,
                })
                    .from(schema_1.employees)
                    .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                    .where((0, drizzle_orm_1.eq)(schema_1.employees.id, managerId))
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
            }
            else {
                const superAdminUserId = await this.findSuperAdminUser(companyId);
                const [superAdmin] = await this.db
                    .select({
                    id: schema_2.users.id,
                    firstName: schema_2.users.firstName,
                    lastName: schema_2.users.lastName,
                    email: schema_2.users.email,
                    avatarUrl: schema_2.users.avatar,
                })
                    .from(schema_2.users)
                    .where((0, drizzle_orm_1.eq)(schema_2.users.id, superAdminUserId))
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
        }, { tags: [`employee:${employeeId}`] });
    }
    async findEmployeeSummaryByUserId(employeeId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Employee not found.');
        return this.cacheService.getOrSetVersioned(row.companyId, this.kEmployee(employeeId, 'summary'), async () => {
            const [employee] = await this.db
                .select({
                id: schema_1.employees.id,
                confirmed: schema_1.employees.confirmed,
                gender: schema_1.employeeProfiles.gender,
                level: schema_1.jobRoles.level,
                country: schema_1.employeeProfiles.country,
                department: schema_1.departments.name,
                userId: schema_1.employees.userId,
            })
                .from(schema_1.employees)
                .innerJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
                .innerJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
                .leftJoin(schema_1.employeeProfiles, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.employeeProfiles.employeeId))
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
                .execute();
            if (!employee)
                throw new common_1.NotFoundException('Employee not found.');
            return employee;
        }, { tags: [`employee:${employeeId}`] });
    }
    async findManagerByEmployeeId(employeeId, companyId) {
        const [employee] = await this.db
            .select({ managerId: schema_1.employees.managerId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .execute();
        if (employee?.managerId) {
            const [manager] = await this.db
                .select({ userId: schema_1.employees.userId })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employee.managerId))
                .execute();
            if (manager?.userId) {
                return manager.userId;
            }
            console.warn('ManagerId exists but user record not found, fallback to super admin.');
        }
        return await this.findSuperAdminUser(companyId);
    }
    async findHrRepresentative(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['hrRepresentative'], async () => {
            const [hr] = await this.db
                .select({ userId: schema_2.users.id })
                .from(schema_1.employees)
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.companyRoles.name, 'hr_manager')))
                .limit(1)
                .execute();
            if (!hr?.userId) {
                throw new common_1.NotFoundException('HR representative not found.');
            }
            return hr.userId;
        });
    }
    async findSuperAdminUser(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['superAdminUserId'], async () => {
            const [ceo] = await this.db
                .select({ id: schema_2.users.id })
                .from(schema_2.users)
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.users.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.companyRoles.name, 'super_admin')))
                .execute();
            if (!ceo) {
                throw new common_1.NotFoundException('CEO user not found.');
            }
            return ceo.id;
        });
    }
    async update(employeeId, dto, userId, ip) {
        const [employee] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .execute();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        const [updated] = await this.db
            .update(this.table)
            .set({
            employmentStatus: dto.employmentStatus,
            departmentId: dto.departmentId,
            jobRoleId: dto.jobRoleId,
            locationId: dto.locationId,
            payGroupId: dto.payGroupId,
            employmentStartDate: dto.employmentStartDate,
            confirmed: dto.confirmed,
            costCenterId: dto.costCenterId,
        })
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .returning()
            .execute();
        if (dto.companyRoleId) {
            await this.db
                .update(schema_2.users)
                .set({ companyRoleId: dto.companyRoleId })
                .where((0, drizzle_orm_1.eq)(schema_2.users.id, employee.userId))
                .execute();
        }
        const changes = {};
        for (const key of Object.keys(dto)) {
            const before = employee[key];
            const after = dto[key];
            if (before !== after)
                changes[key] = { before, after };
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
        await this.cacheService.bumpCompanyVersion(employee.companyId);
        await this.cacheService.invalidateTags([
            `employee:${employeeId}`,
            'employees:list',
            'employees:summary',
        ]);
        return updated;
    }
    async remove(employeeId) {
        const [emp] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .limit(1)
            .execute();
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`employee ${employeeId} not found`);
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
    async buildTemplateWorkbook(companyId) {
        const [depts, roles, centers] = await Promise.all([
            this.cacheService.getOrSetVersioned(companyId, ['lists', 'departments'], () => this.deptSvc.findAll(companyId), { tags: ['lists:departments'] }),
            this.cacheService.getOrSetVersioned(companyId, ['lists', 'roles'], () => this.roleSvc.findAll(companyId), { tags: ['lists:roles'] }),
            this.cacheService.getOrSetVersioned(companyId, ['lists', 'costCenters'], () => this.ccSvc.findAll(companyId), { tags: ['lists:costCenters'] }),
        ]);
        const wb = new exceljs_1.Workbook();
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
    async bulkCreate(user, rows) {
        const t0 = Date.now();
        const { companyId } = user;
        this.logger.info({
            op: 'employees.bulkCreate.start',
            companyId,
            rowsCount: rows?.length ?? 0,
        }, 'Bulk create started');
        try {
            const [allDepts, allRoles, allCenters, allLocations, allPayGroups] = await Promise.all([
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
                    .select({ id: schema_1.costCenters.id, name: schema_1.costCenters.name })
                    .from(schema_1.costCenters)
                    .where((0, drizzle_orm_1.eq)(schema_1.costCenters.companyId, companyId))
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
            const roles = await this.permissionService.getRolesByCompany(companyId);
            const companyRoleMap = new Map(roles.map((r) => [r.name, r.id]));
            const deptMap = new Map(allDepts.map((d) => [d.name, d.id]));
            const roleMap = new Map(allRoles.map((r) => [r.title, r.id]));
            const centerMap = new Map(allCenters.map((c) => [c.name, c.id]));
            const locationMap = new Map(allLocations.map((l) => [l.name, l.id]));
            const groupMap = new Map(allPayGroups.map((g) => [g.name.toLowerCase(), g.id]));
            const empNums = rows.map((r) => r['Employee Number']?.trim());
            const emails = rows.map((r) => r['Email']?.trim().toLowerCase());
            const dupes = await this.db
                .select({ number: schema_1.employees.employeeNumber, email: schema_1.employees.email })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.employees.employeeNumber, empNums), (0, drizzle_orm_1.inArray)(schema_1.employees.email, emails))))
                .execute();
            if (dupes.length) {
                this.logger.warn({
                    op: 'employees.bulkCreate.dupes',
                    companyId,
                    dupesCount: dupes.length,
                    examples: dupes.slice(0, 10),
                }, 'Duplicate employees found; aborting import');
                throw new common_1.BadRequestException(`These employees already exist: ` +
                    dupes.map((d) => `${d.number}/${d.email}`).join(', '));
            }
            const managerEmailMap = new Map();
            const roleMapFromCSV = new Map();
            const imports = [];
            const failedRows = [];
            const normalizedRoleMap = new Map(Array.from(new Map([
                ['HR Manager', 'hr_manager'],
                ['HR Assistant', 'hr_assistant'],
                ['Recruiter', 'recruiter'],
                ['Payroll Specialist', 'payroll_specialist'],
                ['Benefits Admin', 'benefits_admin'],
                ['Finance Manager', 'finance_manager'],
                ['Admin', 'admin'],
                ['Employee', 'employee'],
                ['Manager', 'manager'],
            ]).entries()).map(([label, key]) => [label.trim().toLowerCase(), key]));
            for (const [index, row] of rows.entries()) {
                try {
                    const email = row['Email']?.trim().toLowerCase();
                    const managerEmail = row['Manager Email']?.trim()?.toLowerCase() || '';
                    const rawRole = row['Role']?.trim().toLowerCase();
                    const role = normalizedRoleMap.get(rawRole) ?? 'employee';
                    if (!normalizedRoleMap.has(rawRole)) {
                        this.logger.warn({
                            op: 'employees.bulkCreate.unknownRole',
                            rowIndex: index + 1,
                            email,
                            rawRole,
                        }, 'Unknown role in CSV — defaulting to "employee"');
                    }
                    if (managerEmail && email === managerEmail) {
                        throw new common_1.BadRequestException('An employee cannot be their own manager.');
                    }
                    if (managerEmail)
                        managerEmailMap.set(email, managerEmail);
                    roleMapFromCSV.set(email, role);
                    const departmentId = deptMap.get(row['Department']?.trim() ?? '');
                    const jobRoleId = roleMap.get(row['Job Role']?.trim() ?? '');
                    const costCenterId = centerMap.get(row['Cost Center']?.trim() ?? '');
                    const locationId = locationMap.get(row['Location']?.trim() ?? '');
                    const payGroupName = row['Pay Group']?.trim().toLowerCase() ?? '';
                    const payGroupId = groupMap.get(payGroupName);
                    if (!payGroupId) {
                        throw new common_1.BadRequestException(`Unknown Pay Group “${payGroupName}”`);
                    }
                    const today = new Date();
                    const rawDate = row['Effective Date'];
                    const rawProbationDate = row['Probation End Date'];
                    function excelSerialToDate(serial) {
                        const excelEpoch = new Date(1899, 11, 30);
                        const days = parseInt(serial, 10);
                        if (isNaN(days)) {
                            const parsed = new Date(serial);
                            if (isNaN(parsed.getTime()))
                                return null;
                            return parsed.toISOString().split('T')[0];
                        }
                        const date = new Date(excelEpoch.getTime() + days * 86400000);
                        return date.toISOString().split('T')[0];
                    }
                    const empDto = (0, class_transformer_1.plainToInstance)(create_employee_core_dto_1.CreateEmployeeCoreDto, {
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
                    const finDto = (0, class_transformer_1.plainToInstance)(create_finance_dto_1.CreateFinanceDto, {
                        bankName: row['Bank Name']?.trim(),
                        bankAccountNumber: row['Bank Account Number']?.toString().trim(),
                        bankBranch: row['Bank Branch']?.toString().trim(),
                        bankAccountName: `${row['First Name']?.trim()} ${row['Last Name']?.trim()}`,
                        tin: row['TIN']?.toString().trim(),
                        pensionPin: row['Pension PIN']?.toString().trim(),
                        nhfNumber: row['NHF Number']?.toString().trim(),
                    });
                    const compDto = (0, class_transformer_1.plainToInstance)(create_compensation_dto_1.CreateCompensationDto, {
                        effectiveDate: excelSerialToDate(row['Effective Date']),
                        grossSalary: parseInt(row['Gross Salary']?.toString().trim() ?? '0', 10),
                        currency: row['Currency'] ? row['Currency'].trim() : 'NGN',
                        payFrequency: row['Pay Frequency']
                            ? row['Pay Frequency'].trim()
                            : 'Monthly',
                    });
                    await (0, class_validator_1.validateOrReject)(empDto);
                    await (0, class_validator_1.validateOrReject)(finDto);
                    await (0, class_validator_1.validateOrReject)(compDto);
                    imports.push({ empDto, finDto, compDto });
                }
                catch (error) {
                    const msg = Array.isArray(error)
                        ? error.map((e) => e.toString()).join('; ')
                        : error.message;
                    failedRows.push({
                        rowIndex: index + 1,
                        employeeNumber: row['Employee Number'],
                        email: row['Email'],
                        error: msg,
                    });
                    this.logger.warn({
                        op: 'employees.bulkCreate.rowFailed',
                        companyId,
                        rowIndex: index + 1,
                        email: row['Email'],
                        error: msg,
                    }, 'Row validation failed');
                }
            }
            this.logger.info({
                op: 'employees.bulkCreate.validated',
                companyId,
                rows: rows.length,
                readyToImport: imports.length,
                failedRows: failedRows.length,
            }, 'Bulk create validation completed');
            if (imports.length === 0) {
                const durationMs = Date.now() - t0;
                this.logger.warn({
                    op: 'employees.bulkCreate.empty',
                    companyId,
                    failedRows: failedRows.length,
                    durationMs,
                }, 'No valid rows to import');
                return {
                    successCount: 0,
                    failedCount: failedRows.length,
                    failedRows,
                    created: [],
                };
            }
            const fallbackManagerUserId = await this.resolveFallbackManager(companyId);
            let createdUsersCount = 0;
            let createdEmpsCount = 0;
            const result = await this.db.transaction(async (trx) => {
                const plainPasswords = imports.map(() => (0, crypto_1.randomBytes)(12).toString('hex'));
                const hashedPasswords = await Promise.all(plainPasswords.map((pw) => bcrypt.hash(pw, 6)));
                const userValues = imports.map(({ empDto }, idx) => ({
                    email: empDto.email.toLowerCase(),
                    firstName: empDto.firstName,
                    lastName: empDto.lastName,
                    password: hashedPasswords[idx],
                    companyRoleId: companyRoleMap.get(roleMapFromCSV.get(empDto.email.toLowerCase()) ?? 'employee'),
                    companyId,
                }));
                const createdUsers = await trx
                    .insert(schema_2.users)
                    .values(userValues)
                    .returning({ id: schema_2.users.id, email: schema_2.users.email })
                    .execute();
                createdUsersCount = createdUsers.length;
                const userIdMap = new Map(createdUsers.map((u) => [u.email, u.id]));
                const empValues = imports.map(({ empDto }) => ({
                    ...empDto,
                    userId: userIdMap.get(empDto.email.toLowerCase()),
                    companyId,
                    employmentStatus: empDto.employmentStatus,
                }));
                const createdEmps = await trx
                    .insert(schema_1.employees)
                    .values(empValues)
                    .returning({
                    id: schema_1.employees.id,
                    employeeNumber: schema_1.employees.employeeNumber,
                    email: schema_1.employees.email,
                })
                    .execute();
                createdEmpsCount = createdEmps.length;
                const empEmailIdMap = new Map();
                createdEmps.forEach((e, i) => empEmailIdMap.set(userValues[i].email, e.id));
                function hasCircularReference(empEmail, visited = new Set()) {
                    let current = empEmail;
                    while (managerEmailMap.has(current)) {
                        const manager = managerEmailMap.get(current);
                        if (manager === empEmail || visited.has(manager))
                            return true;
                        visited.add(manager);
                        current = manager;
                    }
                    return false;
                }
                for (const [email] of managerEmailMap.entries()) {
                    if (hasCircularReference(email)) {
                        this.logger.error({ op: 'employees.bulkCreate.circular', companyId, email }, 'Circular manager reference detected');
                        throw new common_1.BadRequestException(`Circular reference detected for ${email}`);
                    }
                }
                for (const [empEmail, mgrEmail] of managerEmailMap.entries()) {
                    const empId = empEmailIdMap.get(empEmail);
                    const mgrId = empEmailIdMap.get(mgrEmail) ?? fallbackManagerUserId;
                    if (empId && mgrId) {
                        await trx
                            .update(schema_1.employees)
                            .set({ managerId: mgrId })
                            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, empId))
                            .execute();
                    }
                }
                const finValues = createdEmps.map((e, i) => ({
                    employeeId: e.id,
                    ...imports[i].finDto,
                }));
                await trx.insert(schema_1.employeeFinancials).values(finValues).execute();
                const compValues = createdEmps.map((e, i) => ({
                    employeeId: e.id,
                    ...imports[i].compDto,
                }));
                await trx.insert(compensation_schema_1.employeeCompensations).values(compValues).execute();
                await this.companySettingsService.setOnboardingTask(companyId, 'employees', 'upload_employees', 'done');
                return createdEmps;
            });
            await this.cacheService.bumpCompanyVersion(companyId);
            await this.cacheService.invalidateTags([
                'employees:list',
                'employees:summary',
            ]);
            const durationMs = Date.now() - t0;
            this.logger.info({
                op: 'employees.bulkCreate.success',
                companyId,
                createdUsers: createdUsersCount,
                createdEmployees: createdEmpsCount,
                failedRows: failedRows.length,
                durationMs,
            }, 'Bulk create finished');
            return {
                successCount: result.length,
                failedCount: failedRows.length,
                failedRows,
                created: result,
            };
        }
        catch (err) {
            const durationMs = Date.now() - t0;
            this.logger.error({
                op: 'employees.bulkCreate.error',
                companyId,
                durationMs,
                error: err instanceof Error
                    ? { name: err.name, message: err.message, stack: err.stack }
                    : err,
            }, 'Bulk create failed');
            throw err;
        }
    }
    async getManagers(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['managers'], async () => {
            return this.db
                .select({
                id: schema_1.employees.id,
                name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            })
                .from(schema_1.employees)
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.companyRoles.name, 'manager')))
                .execute();
        }, { tags: ['employees:managers'] });
    }
    async assignManager(employeeId, managerId) {
        const [employee] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .execute();
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        const [updated] = await this.db
            .update(this.table)
            .set({ managerId })
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .returning()
            .execute();
        await this.cacheService.bumpCompanyVersion(employee.companyId);
        await this.cacheService.invalidateTags([`employee:${employeeId}`]);
        return updated;
    }
    async removeManager(employeeId) {
        const [employee] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .execute();
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        const [updated] = await this.db
            .update(this.table)
            .set({ managerId: null })
            .where((0, drizzle_orm_1.eq)(this.table.id, employeeId))
            .returning()
            .execute();
        await this.cacheService.bumpCompanyVersion(employee.companyId);
        await this.cacheService.invalidateTags([`employee:${employeeId}`]);
        return updated;
    }
    async findFallbackManagers(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['fallbackManagers'], async () => {
            return this.db
                .select({
                id: schema_1.employees.id,
                name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                role: schema_2.companyRoles.name,
                email: schema_2.users.email,
            })
                .from(schema_1.employees)
                .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.employees.userId, schema_2.users.id))
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.users.companyId, companyId), (0, drizzle_orm_1.ne)(schema_2.companyRoles.name, 'employee')))
                .execute();
        }, { tags: ['employees:fallbackManagers'] });
    }
    async resolveFallbackManager(companyId) {
        return this.cacheService.getOrSetVersioned(companyId, ['settings', 'defaultManager'], async () => {
            const fallback = await this.companySettingsService.getDefaultManager(companyId);
            if (fallback?.defaultManager) {
                return fallback.defaultManager;
            }
            const [superAdmin] = await this.db
                .select({ id: schema_2.users.id })
                .from(schema_2.users)
                .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.users.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.companyRoles.name, 'super_admin')))
                .limit(1)
                .execute();
            return superAdmin?.id ?? null;
        }, { tags: ['settings'] });
    }
    async search(dto) {
        const { search, departmentId, jobRoleId, costCenterId, status, locationId, } = dto;
        const maybeClauses = [
            search &&
                (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.employees.firstName, `%${search}%`), (0, drizzle_orm_1.ilike)(schema_1.employees.lastName, `%${search}%`)),
            departmentId && (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, departmentId),
            jobRoleId && (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, jobRoleId),
            costCenterId && (0, drizzle_orm_1.eq)(schema_1.employees.costCenterId, costCenterId),
            status && (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, status),
            locationId && (0, drizzle_orm_1.eq)(schema_1.employees.locationId, locationId),
        ];
        const clauses = maybeClauses.filter((c) => Boolean(c));
        return this.db
            .select({
            id: schema_1.employees.id,
            employeeNumber: schema_1.employees.employeeNumber,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            email: schema_1.employees.email,
            employmentStatus: schema_1.employees.employmentStatus,
            departmentName: schema_1.departments.name,
            jobRoleTitle: schema_1.jobRoles.title,
            costCenterName: schema_1.costCenters.name,
            locationName: schema_1.companyLocations.name,
        })
            .from(schema_1.employees)
            .leftJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.employees.locationId, schema_1.companyLocations.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .leftJoin(schema_1.costCenters, (0, drizzle_orm_1.eq)(schema_1.employees.costCenterId, schema_1.costCenters.id))
            .where(clauses.length ? (0, drizzle_orm_1.and)(...clauses.filter(Boolean)) : undefined)
            .execute();
    }
    async getEmployeeAttendanceByMonth(employeeId, companyId, yearMonth) {
        const [y, m] = yearMonth.split('-').map(Number);
        if (!y || !m)
            throw new Error('yearMonth must be YYYY-MM');
        const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
        const today = new Date();
        const capEnd = monthEnd < today ? monthEnd : today;
        const s = await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTime = s['default_start_time'] ?? '09:00';
        const defaultTolerance = Number(s['late_tolerance_minutes'] ?? 10);
        const shiftMap = {};
        if (useShifts) {
            const monthlyShifts = await this.employeeShiftsService.getEmployeeShiftsForRange(employeeId, companyId, monthStart, monthEnd);
            monthlyShifts.forEach((s) => {
                shiftMap[s.date] = {
                    startTime: s.startTime,
                    endTime: s.endTime ?? null,
                    lateToleranceMinutes: s.lateToleranceMinutes ?? null,
                };
            });
        }
        const rows = await this.db
            .select({
            id: schema_2.attendanceRecords.id,
            clockIn: schema_2.attendanceRecords.clockIn,
            clockOut: schema_2.attendanceRecords.clockOut,
            workDurationMinutes: schema_2.attendanceRecords.workDurationMinutes,
            overtimeMinutes: schema_2.attendanceRecords.overtimeMinutes,
        })
            .from(schema_2.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_2.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_2.attendanceRecords.clockIn, monthStart), (0, drizzle_orm_1.lte)(schema_2.attendanceRecords.clockIn, capEnd)));
        const byDate = new Map();
        for (const r of rows) {
            const dayKey = (0, date_fns_1.format)(r.clockIn, 'yyyy-MM-dd');
            const prev = byDate.get(dayKey);
            if (!prev || r.clockIn < prev.clockIn) {
                byDate.set(dayKey, {
                    clockIn: r.clockIn,
                    clockOut: r.clockOut ?? null,
                    workDurationMinutes: r.workDurationMinutes ?? null,
                    overtimeMinutes: r.overtimeMinutes ?? null,
                });
            }
        }
        const days = (0, date_fns_1.eachDayOfInterval)({ start: monthStart, end: capEnd }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
        const summaryList = days.map((dateKey) => {
            const rec = byDate.get(dateKey);
            if (!rec) {
                return {
                    date: dateKey,
                    checkInTime: null,
                    checkOutTime: null,
                    status: 'absent',
                };
            }
            const shift = useShifts ? shiftMap[dateKey] : undefined;
            const startTime = shift?.startTime ?? defaultStartTime;
            const tol = (shift?.lateToleranceMinutes ?? defaultTolerance) * 60_000;
            const shiftStartISO = `${dateKey}T${startTime}:00`;
            const shiftStart = (0, date_fns_1.parseISO)(shiftStartISO);
            const isLate = (0, date_fns_1.isValid)(shiftStart) &&
                rec.clockIn.getTime() > shiftStart.getTime() + tol;
            return {
                date: dateKey,
                checkInTime: rec.clockIn.toTimeString().slice(0, 8),
                checkOutTime: rec.clockOut
                    ? rec.clockOut.toTimeString().slice(0, 8)
                    : null,
                status: isLate ? 'late' : 'present',
            };
        });
        return { summaryList };
    }
    async getEmployeeAttendanceByDate(employeeId, companyId, date, preload) {
        const target = new Date(date).toISOString().split('T')[0];
        const startOfDay = new Date(`${target}T00:00:00.000Z`);
        const endOfDay = new Date(`${target}T23:59:59.999Z`);
        const recs = await this.db
            .select()
            .from(schema_2.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_2.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_2.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_2.attendanceRecords.clockIn, endOfDay)));
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
        const s = preload?.settings ??
            (await this.attendanceSettingsService.getAllAttendanceSettings(companyId));
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
        const defaultEndTimeStr = s['default_end_time'] ?? '17:00';
        const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
        let startTimeStr = defaultStartTimeStr;
        let endTimeStr = defaultEndTimeStr;
        let tolerance = lateToleranceMins;
        let shift = preload?.shift ?? null;
        if (useShifts && !shift) {
            shift = await this.employeeShiftsService.getActiveShiftForEmployee(employeeId, companyId, target);
        }
        if (shift) {
            startTimeStr = shift.startTime ?? defaultStartTimeStr;
            endTimeStr = shift.endTime ?? defaultEndTimeStr;
            tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
        }
        const shiftStart = (0, date_fns_1.parseISO)(`${target}T${startTimeStr}:00`);
        const shiftEnd = (0, date_fns_1.parseISO)(`${target}T${endTimeStr}:00`);
        const checkIn = new Date(rec.clockIn);
        const checkOut = rec.clockOut ? new Date(rec.clockOut) : null;
        const isLateArrival = (0, date_fns_1.isValid)(shiftStart) &&
            checkIn.getTime() > shiftStart.getTime() + tolerance * 60_000;
        const isEarlyDeparture = !!checkOut &&
            (0, date_fns_1.isValid)(shiftEnd) &&
            checkOut.getTime() < shiftEnd.getTime();
        const workDurationMinutes = rec.workDurationMinutes ?? null;
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
    async findAllLeaveRequestByEmployeeId(employeeId, companyId) {
        return this.cacheService.getOrSetVersioned(companyId, this.kEmployee(employeeId, 'leaveRequests'), async () => {
            const leaveRequestsData = await this.db
                .select({
                requestId: leave_requests_schema_1.leaveRequests.id,
                employeeId: leave_requests_schema_1.leaveRequests.employeeId,
                leaveType: leave_types_schema_1.leaveTypes.name,
                startDate: leave_requests_schema_1.leaveRequests.startDate,
                endDate: leave_requests_schema_1.leaveRequests.endDate,
                status: leave_requests_schema_1.leaveRequests.status,
                reason: leave_requests_schema_1.leaveRequests.reason,
            })
                .from(leave_requests_schema_1.leaveRequests)
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.employeeId, employeeId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
                .execute();
            if (!leaveRequestsData) {
                throw new common_1.NotFoundException('Leave requests not found');
            }
            return leaveRequestsData;
        }, { tags: [`employee:${employeeId}`] });
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = EmployeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, nestjs_pino_1.PinoLogger,
        audit_service_1.AuditService,
        profile_service_1.ProfileService,
        history_service_1.HistoryService,
        dependents_service_1.DependentsService,
        certifications_service_1.CertificationsService,
        compensation_service_1.CompensationService,
        finance_service_1.FinanceService,
        department_service_1.DepartmentService,
        job_roles_service_1.JobRolesService,
        cost_centers_service_1.CostCentersService,
        groups_service_1.GroupsService,
        config_1.ConfigService,
        employee_invitation_service_1.EmployeeInvitationService,
        cache_service_1.CacheService,
        company_settings_service_1.CompanySettingsService,
        permissions_service_1.PermissionsService,
        leave_balance_service_1.LeaveBalanceService,
        attendance_settings_service_1.AttendanceSettingsService,
        employee_shifts_service_1.EmployeeShiftsService,
        payslip_service_1.PayslipService,
        onboarding_service_1.OnboardingService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map