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
const password_reset_service_1 = require("../../notification/services/password-reset.service");
const password_reset_token_schema_1 = require("../../drizzle/schema/password-reset-token.schema");
const deductions_schema_1 = require("../../drizzle/schema/deductions.schema");
const onboarding_service_1 = require("./onboarding.service");
(0, common_1.Injectable)();
let EmployeeService = class EmployeeService {
    constructor(db, aws, cache, config, passwordResetEmailService, onboardingService) {
        this.db = db;
        this.aws = aws;
        this.cache = cache;
        this.config = config;
        this.passwordResetEmailService = passwordResetEmailService;
        this.onboardingService = onboardingService;
    }
    generateToken(payload) {
        const jwtSecret = this.config.get('JWT_SECRET') || 'defaultSecret';
        return jwt.sign(payload, jwtSecret, {
            expiresIn: '1h',
        });
    }
    async addEmployee(dto, company_id) {
        return this.db.transaction(async (trx) => {
            const [companyResult, departmentResult] = await Promise.all([
                trx
                    .select()
                    .from(company_schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                    .execute(),
                dto.department_id
                    ? trx
                        .select()
                        .from(department_schema_1.departments)
                        .where((0, drizzle_orm_1.eq)(department_schema_1.departments.id, dto.department_id))
                        .execute()
                    : null,
            ]);
            if (companyResult.length === 0) {
                throw new common_1.BadRequestException('Company not found');
            }
            if (dto.department_id &&
                departmentResult &&
                departmentResult.length === 0) {
                throw new common_1.BadRequestException('Department not found');
            }
            const randomPassword = (0, crypto_1.randomBytes)(12).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const employeeNumberExists = await trx
                .select()
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.employee_number, dto.employee_number))
                .execute();
            if (employeeNumberExists.length > 0) {
                throw new common_1.BadRequestException(`Employee number ${dto.employee_number} already exists. Please use a unique employee number`);
            }
            const emailExists = await trx
                .select()
                .from(users_schema_1.users)
                .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, dto.email.toLowerCase()))
                .execute();
            if (emailExists.length > 0) {
                throw new common_1.BadRequestException(`Employee with email ${dto.email} already exists. Please use a unique email`);
            }
            const user = await trx
                .insert(users_schema_1.users)
                .values({
                email: dto.email.toLowerCase(),
                password: hashedPassword,
                first_name: dto.first_name,
                last_name: dto.last_name,
            })
                .returning({
                id: users_schema_1.users.id,
            })
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
                employment_status: dto.employment_status,
                start_date: dto.start_date,
                company_id: company_id,
                department_id: dto.department_id || null,
                annual_gross: dto.annual_gross,
                hourly_rate: dto.hourly_rate,
                bonus: dto.bonus,
                commission: dto.commission,
                user_id: user[0].id,
            })
                .returning({
                id: employee_schema_1.employees.id,
                employee_number: employee_schema_1.employees.employee_number,
                first_name: employee_schema_1.employees.first_name,
                email: employee_schema_1.employees.email,
                annual_gross: employee_schema_1.employees.annual_gross,
                hourly_rate: employee_schema_1.employees.hourly_rate,
                bonus: employee_schema_1.employees.bonus,
                commission: employee_schema_1.employees.commission,
                group_id: employee_schema_1.employees.group_id,
            })
                .execute();
            const cacheKey = `employee-${employee[0].id}`;
            this.cache.set(cacheKey, employee[0]);
            const token = this.generateToken({ email: dto.email });
            const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);
            await trx
                .insert(password_reset_token_schema_1.PasswordResetToken)
                .values({
                user_id: user[0].id,
                token,
                expires_at,
                is_used: false,
            })
                .execute();
            await this.onboardingService.completeTask(company_id, 'addEmployees');
            const inviteLink = `${this.config.get('EMPLOYEE_PORTAL_URL')}/auth/reset-password/${token}`;
            await this.passwordResetEmailService.sendPasswordResetEmail(employee[0].email, employee[0].first_name, inviteLink);
            return {
                first_name: employee[0].first_name,
                email: employee[0].email,
            };
        });
    }
    async addMultipleEmployees(dtoArray, company_id) {
        return this.db.transaction(async (trx) => {
            const results = [];
            const departmentIds = Array.from(new Set(dtoArray.map((dto) => dto.department_id).filter((id) => id)));
            const emails = dtoArray.map((dto) => dto.email.toLowerCase());
            const [existingDepartments, existingUsers] = await Promise.all([
                departmentIds.length
                    ? trx
                        .select()
                        .from(department_schema_1.departments)
                        .where((0, drizzle_orm_1.inArray)(department_schema_1.departments.id, departmentIds))
                        .execute()
                    : Promise.resolve([]),
                trx.select().from(users_schema_1.users).where((0, drizzle_orm_1.inArray)(users_schema_1.users.email, emails)).execute(),
            ]);
            const departmentMap = new Map(existingDepartments.map((department) => [department.id, department]));
            const emailSet = new Set(existingUsers.map((user) => user.email));
            for (const dto of dtoArray) {
                const lowerCaseEmail = dto.email.toLowerCase();
                if (emailSet.has(lowerCaseEmail)) {
                    throw new common_1.BadRequestException(`Employee with email ${dto.email} already exists. Please use a unique email`);
                }
                if (dto.department_id && !departmentMap.has(dto.department_id)) {
                    results.push({
                        email: dto.email,
                        status: 'Failed',
                        reason: 'Department not found',
                    });
                    continue;
                }
                const companyResult = await trx
                    .select()
                    .from(company_schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                    .execute();
                if (companyResult.length === 0) {
                    throw new common_1.BadRequestException('Company not found');
                }
                const randomPassword = (0, crypto_1.randomBytes)(12).toString('hex');
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                try {
                    await trx
                        .insert(users_schema_1.users)
                        .values({
                        email: lowerCaseEmail,
                        password: hashedPassword,
                        first_name: dto.first_name,
                        last_name: dto.last_name,
                    })
                        .returning({
                        id: users_schema_1.users.id,
                    })
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
                        employment_status: dto.employment_status,
                        start_date: dto.start_date,
                        company_id: company_id,
                        department_id: dto.department_id || null,
                        annual_gross: dto.annual_gross,
                        hourly_rate: dto.hourly_rate,
                        bonus: dto.bonus,
                        commission: dto.commission,
                    })
                        .returning({
                        id: employee_schema_1.employees.id,
                        employee_number: employee_schema_1.employees.employee_number,
                        first_name: employee_schema_1.employees.first_name,
                        email: employee_schema_1.employees.email,
                        annual_gross: employee_schema_1.employees.annual_gross,
                        hourly_rate: employee_schema_1.employees.hourly_rate,
                        bonus: employee_schema_1.employees.bonus,
                        commission: employee_schema_1.employees.commission,
                        group_id: employee_schema_1.employees.group_id,
                    })
                        .execute();
                    results.push({
                        email: employee[0].email,
                        employee_number: employee[0].employee_number,
                        first_name: employee[0].first_name,
                        password: randomPassword,
                        status: 'Success',
                        company_id: companyResult[0].id,
                    });
                    await this.onboardingService.completeTask(company_id, 'addEmployees');
                    const cacheKey = `employee-${employee[0].id}`;
                    this.cache.set(cacheKey, employee[0]);
                }
                catch (error) {
                    if (error.message.includes('employees_employee_number_unique')) {
                        throw new common_1.BadRequestException(`Duplicate employee number: ${dto.employee_number}. Please use a unique employee number`);
                    }
                    else {
                        throw new common_1.BadRequestException(`Error during employee creation: ' + ${error.message}`);
                    }
                }
            }
            this.aws.uploadCsvToS3(results[0].company_id, dtoArray);
            return results;
        });
    }
    async getEmployeeByUserId(user_id) {
        const result = await this.db
            .select({
            id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            job_title: employee_schema_1.employees.job_title,
            phone: employee_schema_1.employees.phone,
            email: employee_schema_1.employees.email,
            company_name: company_schema_1.companies.name,
            salary: employee_schema_1.employees.annual_gross,
            apply_paye: deductions_schema_1.taxConfig.apply_paye,
            apply_nhf: deductions_schema_1.taxConfig.apply_nhf,
            apply_pension: deductions_schema_1.taxConfig.apply_pension,
        })
            .from(employee_schema_1.employees)
            .innerJoin(company_schema_1.companies, (0, drizzle_orm_1.eq)(company_schema_1.companies.id, employee_schema_1.employees.company_id))
            .innerJoin(deductions_schema_1.taxConfig, (0, drizzle_orm_1.eq)(deductions_schema_1.taxConfig.company_id, company_schema_1.companies.id))
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
            hourly_rate: employee_schema_1.employees.hourly_rate,
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
            hourly_rate: dto.hourly_rate,
        })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        return 'Employee updated successfully';
    }
    async deleteEmployee(employee_id) {
        const existingEmployee = await this.getEmployeeById(employee_id);
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
    async getEmployeeGroups(company_id) {
        const result = await this.db
            .select()
            .from(employee_schema_1.employee_groups)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_groups.company_id, company_id))
            .execute();
        return result;
    }
    async createEmployeeGroup(company_id, dto) {
        const result = await this.db
            .insert(employee_schema_1.employee_groups)
            .values({
            ...dto,
            company_id: company_id,
        })
            .returning()
            .execute();
        if (dto.employees && dto.employees.length > 0) {
            await this.addEmployeesToGroup(dto.employees, result[0].id);
        }
        const cacheKey = `employee-group-${result[0].id}`;
        this.cache.set(cacheKey, result[0]);
        return result[0];
    }
    async getEmployeeGroup(group_id) {
        const cacheKey = `employee-group-${group_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const result = await this.db
                .select()
                .from(employee_schema_1.employee_groups)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_groups.id, group_id))
                .execute();
            if (result.length === 0) {
                throw new common_1.BadRequestException('Employee group not found, please provide a valid group id');
            }
            return result[0];
        });
    }
    async updateEmployeeGroup(group_id, dto) {
        await this.getEmployeeGroup(group_id);
        await this.db
            .update(employee_schema_1.employee_groups)
            .set({
            ...dto,
        })
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_groups.id, group_id))
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
        await this.db
            .delete(employee_schema_1.employee_groups)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employee_groups.id, group_id))
            .execute();
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
        const cacheUpdatePromises = employeeIdArray.map(async (employeeId) => {
            const cacheKey = `employee-${employeeId}`;
            this.cache.del(cacheKey);
            const employeeData = await this.getEmployeeById(employeeId);
            return this.cache.set(cacheKey, employeeData);
        });
        await Promise.all(cacheUpdatePromises);
        return `${employeeIdArray.length} employees added to group ${group_id} successfully`;
    }
    async removeEmployeesFromGroup(employee_ids) {
        console.log(employee_ids);
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
        const cacheUpdatePromises = employeeIdArray.map(async (employeeId) => {
            const cacheKey = `employee-${employeeId}`;
            this.cache.del(cacheKey);
            const employeeData = await this.getEmployeeById(employeeId);
            return this.cache.set(cacheKey, employeeData);
        });
        await Promise.all(cacheUpdatePromises);
        return `${employeeIdArray.length} employees removed from the group successfully`;
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
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        cache_service_1.CacheService,
        config_1.ConfigService,
        password_reset_service_1.PasswordResetEmailService,
        onboarding_service_1.OnboardingService])
], EmployeeService);
//# sourceMappingURL=employee.service.js.map