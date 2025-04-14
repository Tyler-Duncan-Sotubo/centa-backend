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
exports.EmployeeService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const department_schema_1 = require("../../drizzle/schema/department.schema");
const bcrypt = require("bcryptjs");
const crypto_1 = require("crypto");
const users_schema_1 = require("../../drizzle/schema/users.schema");
const aws_service_1 = require("../../config/aws/aws.service");
const cache_service_1 = require("../../config/cache/cache.service");
const config_1 = require("@nestjs/config");
const https = require('https');
const jwt = require("jsonwebtoken");
const employee_invitation_service_1 = require("../../notification/services/employee-invitation.service");
const password_reset_token_schema_1 = require("../../drizzle/schema/password-reset-token.schema");
const onboarding_service_1 = require("./onboarding.service");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const loans_schema_1 = require("../../drizzle/schema/loans.schema");
(0, common_1.Injectable)();
let EmployeeService = class EmployeeService {
    constructor(db, aws, cache, config, onboardingService, employeeInvitationService, emailQueue) {
        this.db = db;
        this.aws = aws;
        this.cache = cache;
        this.config = config;
        this.onboardingService = onboardingService;
        this.employeeInvitationService = employeeInvitationService;
        this.emailQueue = emailQueue;
        this.normalizeName = (name) => name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    generateToken(payload) {
        const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
        return jwt.sign(payload, jwtSecret, {
            expiresIn: '1h',
        });
    }
    async addEmployee(dto, company_id) {
        return this.db.transaction(async (trx) => {
            const [companyResult, existingDepartment, existingGroups] = await Promise.all([
                trx
                    .select()
                    .from(company_schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                    .execute(),
                dto.department_name
                    ? trx
                        .select()
                        .from(department_schema_1.departments)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(department_schema_1.departments.name, dto.department_name), (0, drizzle_orm_1.eq)(department_schema_1.departments.company_id, company_id)))
                        .execute()
                    : null,
                dto.group_name
                    ? trx
                        .select()
                        .from(payroll_schema_1.payGroups)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.name, dto.group_name), (0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.company_id, company_id)))
                        .execute()
                    : null,
            ]);
            if (companyResult.length === 0) {
                throw new common_1.BadRequestException('Company not found');
            }
            let groupId = null;
            if (dto.group_name) {
                if (existingGroups && existingGroups.length > 0) {
                    groupId = existingGroups[0].id;
                }
            }
            let departmentId = null;
            if (dto.department_name) {
                if (existingDepartment && existingDepartment.length > 0) {
                    departmentId = existingDepartment[0].id;
                }
                else {
                    const [newDepartment] = await trx
                        .insert(department_schema_1.departments)
                        .values({
                        name: dto.department_name,
                        company_id: company_id,
                    })
                        .returning({ id: department_schema_1.departments.id })
                        .execute();
                    departmentId = newDepartment.id;
                }
            }
            const randomPassword = (0, crypto_1.randomBytes)(12).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const emailExists = await trx
                .select()
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, dto.email.toLowerCase()))
                .execute();
            if (emailExists.length > 0) {
                throw new common_1.BadRequestException(`Employee with email ${dto.email} already exists. Please use a unique email`);
            }
            const [user] = await trx
                .insert(users_schema_1.users)
                .values({
                email: dto.email.toLowerCase(),
                password: hashedPassword,
                first_name: dto.first_name,
                last_name: dto.last_name,
                company_id: company_id,
            })
                .returning({ id: users_schema_1.users.id })
                .execute();
            const employee = await trx
                .insert(employee_schema_1.employees)
                .values({
                employee_number: dto.employee_number,
                first_name: dto.first_name,
                last_name: dto.last_name,
                job_title: dto.job_title,
                email: dto.email,
                phone: dto.phone,
                start_date: dto.start_date,
                company_id: company_id,
                department_id: departmentId,
                annual_gross: dto.annual_gross * 100,
                bonus: dto.bonus,
                commission: dto.commission,
                user_id: user.id,
                group_id: groupId,
                apply_nhf: dto.apply_nhf === 'Yes' ? true : false,
            })
                .returning({
                id: employee_schema_1.employees.id,
                employee_number: employee_schema_1.employees.employee_number,
                first_name: employee_schema_1.employees.first_name,
                email: employee_schema_1.employees.email,
            })
                .execute();
            const token = this.generateToken({ email: dto.email });
            const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);
            await trx
                .insert(password_reset_token_schema_1.PasswordResetToken)
                .values({
                user_id: user.id,
                token,
                expires_at,
                is_used: false,
            })
                .execute();
            await trx
                .insert(employee_schema_1.employee_bank_details)
                .values({
                employee_id: employee[0].id,
                bank_name: dto.bank_name,
                bank_account_number: dto.bank_account_number,
                bank_account_name: dto.first_name + ' ' + dto.last_name,
            })
                .execute();
            await trx
                .insert(employee_schema_1.employee_tax_details)
                .values({
                employee_id: employee[0].id,
                tin: dto.tin,
                pension_pin: dto.pension_pin,
                nhf_number: dto.nhf_number,
            })
                .execute();
            await this.onboardingService.completeTask(company_id, 'addTeamMembers');
            const inviteLink = `${this.config.get('EMPLOYEE_PORTAL_URL')}/auth/reset-password/${token}`;
            await this.employeeInvitationService.sendInvitationEmail(employee[0].email, employee[0].first_name, companyResult[0].name, 'Employee', inviteLink);
            return {
                first_name: employee[0].first_name,
                email: employee[0].email,
            };
        });
    }
    async addMultipleEmployees(dtoArray, company_id) {
        return this.db.transaction(async (trx) => {
            const companyExists = await trx
                .select({ id: company_schema_1.companies.id, name: company_schema_1.companies.name })
                .from(company_schema_1.companies)
                .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                .execute();
            if (companyExists.length === 0) {
                throw new common_1.BadRequestException('Company not found');
            }
            const departmentNames = new Set(dtoArray
                .map((dto) => this.normalizeName(dto.department_name?.trim().toLowerCase()))
                .filter(Boolean));
            const groupNames = new Set(dtoArray
                .map((dto) => dto.group_name?.trim().toLowerCase())
                .filter(Boolean));
            const emails = dtoArray.map((dto) => dto.email.toLowerCase());
            const [existingDepartments, existingGroups, existingUsers] = await Promise.all([
                departmentNames.size
                    ? trx
                        .select({ id: department_schema_1.departments.id, name: department_schema_1.departments.name })
                        .from(department_schema_1.departments)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(department_schema_1.departments.name, [...departmentNames]), (0, drizzle_orm_1.eq)(department_schema_1.departments.company_id, company_id)))
                        .execute()
                    : Promise.resolve([]),
                groupNames.size
                    ? trx
                        .select({ id: payroll_schema_1.payGroups.id, name: payroll_schema_1.payGroups.name })
                        .from(payroll_schema_1.payGroups)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(payroll_schema_1.payGroups.name, [...groupNames]), (0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.company_id, company_id)))
                        .execute()
                    : Promise.resolve([]),
                trx
                    .select()
                    .from(users_schema_1.users)
                    .where((0, drizzle_orm_1.inArray)(users_schema_1.users.email, emails))
                    .execute(),
            ]);
            const departmentMap = new Map(existingDepartments.map((d) => [d.name.toLowerCase(), d.id]));
            const groupMap = new Map(existingGroups.map((g) => [g.name.toLowerCase(), g.id]));
            const existingEmails = new Set(existingUsers.map((u) => u.email));
            const newDepartments = [...departmentNames].filter((name) => !departmentMap.has(name));
            if (newDepartments.length) {
                const insertedDepartments = await trx
                    .insert(department_schema_1.departments)
                    .values(newDepartments.map((name) => ({
                    name: this.normalizeName(name),
                    company_id,
                })))
                    .returning({ id: department_schema_1.departments.id, name: department_schema_1.departments.name })
                    .execute();
                insertedDepartments.forEach((d) => departmentMap.set(d.name.toLowerCase(), d.id));
            }
            const hashedPasswords = await Promise.all(dtoArray.map(() => bcrypt.hash((0, crypto_1.randomBytes)(12).toString('hex'), 10)));
            const usersToInsert = dtoArray
                .filter((dto) => !existingEmails.has(dto.email.toLowerCase()))
                .map((dto, index) => ({
                email: dto.email.toLowerCase(),
                password: hashedPasswords[index],
                first_name: dto.first_name,
                last_name: dto.last_name,
                company_id,
            }));
            const insertedUsers = await trx
                .insert(users_schema_1.users)
                .values(usersToInsert)
                .returning({ id: users_schema_1.users.id, email: users_schema_1.users.email })
                .execute();
            const userMap = new Map(insertedUsers.map((user) => [user.email, user.id]));
            const employeesToInsert = dtoArray.map((dto) => ({
                employee_number: dto.employee_number,
                first_name: dto.first_name,
                last_name: dto.last_name,
                job_title: dto.job_title,
                email: dto.email,
                phone: dto.phone,
                start_date: dto.start_date,
                company_id,
                department_id: departmentMap.get(dto.department_name?.trim().toLowerCase()) || null,
                annual_gross: dto.annual_gross * 100,
                bonus: dto.bonus,
                commission: dto.commission,
                user_id: userMap.get(dto.email.toLowerCase()),
                group_id: groupMap.get(dto.group_name?.trim().toLowerCase()) || null,
                apply_nhf: dto.apply_nhf === 'Yes',
            }));
            const insertedEmployees = await trx
                .insert(employee_schema_1.employees)
                .values(employeesToInsert)
                .returning({
                id: employee_schema_1.employees.id,
                email: employee_schema_1.employees.email,
                first_name: employee_schema_1.employees.first_name,
                user_id: employee_schema_1.employees.user_id,
            })
                .execute();
            const employeeMap = new Map(insertedEmployees.map((e) => [e.email, e.id]));
            await Promise.all([
                trx
                    .insert(employee_schema_1.employee_bank_details)
                    .values(dtoArray.map((dto) => ({
                    employee_id: employeeMap.get(dto.email) || '',
                    bank_name: dto.bank_name,
                    bank_account_number: dto.bank_account_number,
                    bank_account_name: `${dto.first_name} ${dto.last_name}`,
                })))
                    .execute(),
                trx
                    .insert(employee_schema_1.employee_tax_details)
                    .values(dtoArray.map((dto) => ({
                    employee_id: employeeMap.get(dto.email) || '',
                    tin: dto.tin,
                    pension_pin: dto.pension_pin,
                    nhf_number: dto.nhf_number,
                })))
                    .execute(),
            ]);
            const tokensToInsert = insertedEmployees.map((employee) => ({
                user_id: employee.user_id || '',
                token: this.generateToken({ email: employee.email }),
                expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000),
                is_used: false,
            }));
            await trx.insert(password_reset_token_schema_1.PasswordResetToken).values(tokensToInsert).execute();
            const employeePortalUrl = this.config.get('EMPLOYEE_PORTAL_URL');
            await Promise.all(insertedEmployees.map((employee) => {
                const token = tokensToInsert.find((t) => t.user_id === userMap.get(employee.email))?.token;
                const inviteLink = `${employeePortalUrl}/auth/reset-password/${token}`;
                this.emailQueue.add('sendPasswordResetEmail', {
                    email: employee.email,
                    name: employee.first_name,
                    companyName: companyExists[0].name,
                    role: 'Employee',
                    resetLink: inviteLink,
                });
            }));
            await this.onboardingService.completeTask(company_id, 'addTeamMembers');
            return insertedEmployees.map((employee) => ({
                email: employee.email,
                status: 'Success',
                company_id,
            }));
        });
    }
    async getEmployeeByUserId(user_id) {
        const result = await this.db
            .select({
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            job_title: employee_schema_1.employees.job_title,
            avatar: users_schema_1.users.avatar,
            email: employee_schema_1.employees.email,
            annual_gross: employee_schema_1.employees.annual_gross,
            group_id: employee_schema_1.employees.group_id,
            companyId: company_schema_1.companies.id,
            id: employee_schema_1.employees.id,
            company_name: company_schema_1.companies.name,
            apply_nhf: employee_schema_1.employees.apply_nhf,
        })
            .from(employee_schema_1.employees)
            .innerJoin(company_schema_1.companies, (0, drizzle_orm_1.eq)(company_schema_1.companies.id, employee_schema_1.employees.company_id))
            .innerJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.id, employee_schema_1.employees.user_id))
            .leftJoin(employee_schema_1.employee_bank_details, (0, drizzle_orm_1.eq)(employee_schema_1.employee_bank_details.employee_id, user_id))
            .leftJoin(employee_schema_1.employee_tax_details, (0, drizzle_orm_1.eq)(employee_schema_1.employee_tax_details.employee_id, user_id))
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.user_id, user_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Employee not found, please provide a valid email');
        }
        return result[0];
    }
    async getEmployees(company_id) {
        const result = await this.db
            .select()
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Employee not found, please provide a valid user id');
        }
        return result;
    }
    async getEmployeesSummary(company_id) {
        const cacheKey = `employees-summary-${company_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const result = await this.db
                .select({
                first_name: employee_schema_1.employees.first_name,
                last_name: employee_schema_1.employees.last_name,
                id: employee_schema_1.employees.id,
            })
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
                .execute();
            if (result.length === 0) {
                throw new common_1.BadRequestException('Employee not found, please provide a valid user id');
            }
            return result;
        });
    }
    async getEmployeeById(employee_id) {
        const result = await this.db
            .select({
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            job_title: employee_schema_1.employees.job_title,
            phone: employee_schema_1.employees.phone,
            email: employee_schema_1.employees.email,
            employment_status: employee_schema_1.employees.employment_status,
            start_date: employee_schema_1.employees.start_date,
            is_active: employee_schema_1.employees.is_active,
            employee_number: employee_schema_1.employees.employee_number,
            department_id: employee_schema_1.employees.department_id,
            annual_gross: employee_schema_1.employees.annual_gross,
            bonus: employee_schema_1.employees.bonus,
            commission: employee_schema_1.employees.commission,
            group_id: employee_schema_1.employees.group_id,
            employee_bank_details: employee_schema_1.employee_bank_details,
            employee_tax_details: employee_schema_1.employee_tax_details,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .leftJoin(employee_schema_1.employee_bank_details, (0, drizzle_orm_1.eq)(employee_schema_1.employee_bank_details.employee_id, employee_id))
            .leftJoin(employee_schema_1.employee_tax_details, (0, drizzle_orm_1.eq)(employee_schema_1.employee_tax_details.employee_id, employee_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.BadRequestException('Employee not found, please provide a valid employee id');
        }
        return result[0];
    }
    async getEmployeesByDepartment(department_id) {
        const cacheKey = `employees-${department_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const result = await this.db
                .select({
                first_name: employee_schema_1.employees.first_name,
                last_name: employee_schema_1.employees.last_name,
                job_title: employee_schema_1.employees.job_title,
                email: employee_schema_1.employees.email,
                employment_status: employee_schema_1.employees.employment_status,
                start_date: employee_schema_1.employees.start_date,
                is_active: employee_schema_1.employees.is_active,
            })
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.department_id, department_id))
                .execute();
            if (result.length === 0) {
                throw new common_1.BadRequestException('No employees found in this department');
            }
            return result;
        });
    }
    async updateEmployee(employee_id, dto) {
        await this.getEmployeeById(employee_id);
        await this.db
            .update(employee_schema_1.employees)
            .set({
            first_name: dto.first_name,
            last_name: dto.last_name,
            job_title: dto.job_title,
            employment_status: dto.employment_status,
            start_date: dto.start_date,
            department_id: dto.department_id,
            is_active: dto.is_active,
            annual_gross: dto.annual_gross,
        })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        return 'Employee updated successfully';
    }
    async deleteEmployee(employee_id) {
        const existingEmployee = await this.getEmployeeById(employee_id);
        const hasActiveLoan = await this.db
            .select()
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id)))
            .execute();
        if (hasActiveLoan.length > 0) {
            throw new common_1.BadRequestException('Employee has an active loan. Please clear the loan before deleting the employee.');
        }
        await this.db
            .delete(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        await this.db
            .delete(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, existingEmployee.email))
            .execute();
        return { message: 'Employee deleted successfully' };
    }
    async addEmployeeBankDetails(employee_id, dto) {
        await this.getEmployeeById(employee_id);
        const result = await this.db
            .insert(employee_schema_1.employee_bank_details)
            .values({
            employee_id: employee_id,
            ...dto,
        })
            .returning()
            .execute();
        return result[0];
    }
    async updateEmployeeBankDetails(employee_id, dto) {
        await this.getEmployeeById(employee_id);
        await this.db
            .update(employee_schema_1.employee_bank_details)
            .set({
            employee_id: employee_id,
            ...dto,
        })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_bank_details.employee_id, employee_id))
            .execute();
        return 'Employee bank details updated successfully';
    }
    async addEmployeeTaxDetails(employee_id, dto) {
        await this.getEmployeeById(employee_id);
        const result = await this.db
            .insert(employee_schema_1.employee_tax_details)
            .values({
            employee_id: employee_id,
            ...dto,
        })
            .returning()
            .execute();
        return result[0];
    }
    async updateEmployeeTaxDetails(employee_id, dto) {
        await this.getEmployeeById(employee_id);
        await this.db
            .update(employee_schema_1.employee_tax_details)
            .set({
            employee_id: employee_id,
            ...dto,
        })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_tax_details.employee_id, employee_id))
            .execute();
        return 'Employee tax details updated successfully';
    }
    async verifyBankAccount(accountNumber, bankCode) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.paystack.co',
                port: 443,
                path: `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
                },
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status) {
                            resolve(response.data);
                        }
                        else {
                            reject(new common_1.BadRequestException(response.message || 'Account verification failed'));
                        }
                    }
                    catch (error) {
                        console.error('Error parsing JSON response:', error);
                        reject(new Error('Invalid JSON response from Paystack'));
                    }
                });
            });
            req.on('error', (error) => {
                reject(new Error(`Request error: ${error.message}`));
            });
            req.end();
        });
    }
};
exports.EmployeeService = EmployeeService;
exports.EmployeeService = EmployeeService = __decorate([
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(6, (0, bullmq_1.InjectQueue)('emailQueue')),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        cache_service_1.CacheService,
        config_1.ConfigService,
        onboarding_service_1.OnboardingService,
        employee_invitation_service_1.EmployeeInvitationService,
        bullmq_2.Queue])
], EmployeeService);
//# sourceMappingURL=employee.service.js.map