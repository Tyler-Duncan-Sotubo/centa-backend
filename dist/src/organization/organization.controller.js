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
exports.OrganizationController = void 0;
const common_1 = require("@nestjs/common");
const services_1 = require("./services");
const dto_1 = require("./dto");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../config/base.controller");
const csvParser = require("csv-parser");
const fs_1 = require("fs");
const path_1 = require("path");
const platform_express_1 = require("@nestjs/platform-express");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const promises_1 = require("fs/promises");
const create_employee_tax_details_dto_1 = require("./dto/create-employee-tax-details.dto");
const update_employee_tax_details_dto_1 = require("./dto/update-employee-tax-details.dto");
const create_pay_frequency_dto_1 = require("./dto/create-pay-frequency.dto");
const create_company_tax_dto_1 = require("./dto/create-company-tax.dto");
let OrganizationController = class OrganizationController extends base_controller_1.BaseController {
    constructor(company, department, employee) {
        super();
        this.company = company;
        this.department = department;
        this.employee = employee;
        this.fieldMapping = {
            'Employee Number': 'employee_number',
            'First Name': 'first_name',
            'Last Name': 'last_name',
            'Job Title': 'job_title',
            Email: 'email',
            Phone: 'phone',
            'Employment Status': 'employment_status',
            'Start Date': 'start_date',
            'Company ID': 'company_id',
            'Department ID': 'department_id',
            'Is Active': 'is_active',
            'Annual Gross': 'annual_gross',
            'Hourly Rate': 'hourly_rate',
            Bonus: 'bonus',
            Commission: 'commission',
        };
    }
    createCompany(dto, user) {
        return this.company.createCompany(dto, user.company_id);
    }
    getCompany(user) {
        return this.company.getCompanyByUserId(user.company_id);
    }
    updateCompany(dto, user) {
        return this.company.updateCompany(dto, user.company_id);
    }
    deleteCompany(user) {
        return this.company.deleteCompany(user.company_id);
    }
    createCompanyContact(dto, companyId) {
        return this.company.addContactToCompany(dto, companyId);
    }
    getCompanyContacts(companyId) {
        return this.company.getContactInCompany(companyId);
    }
    updateCompanyContact(dto, companyId) {
        return this.company.updateContactInCompany(dto, companyId);
    }
    getPayFrequency(user) {
        return this.company.getPayFrequency(user.company_id);
    }
    updatePayFrequency(dto, user) {
        return this.company.updatePayFrequency(user.company_id, dto);
    }
    createCompanyTaxDetails(dto, user) {
        return this.company.createCompanyTaxDetails(user.company_id, dto);
    }
    getCompanyTaxDetails(user) {
        return this.company.getCompanyTaxDetails(user.company_id);
    }
    updateCompanyTaxDetails(dto, user) {
        return this.company.updateCompanyTaxDetails(user.company_id, dto);
    }
    createDepartment(dto, user) {
        return this.department.createDepartment(dto, user.company_id);
    }
    getDepartment(user) {
        console.log(user);
        return this.department.getDepartments(user.company_id);
    }
    getDepartmentById(departmentId) {
        return this.department.getDepartmentById(departmentId);
    }
    updateDepartment(departmentId, dto) {
        return this.department.updateDepartment(dto, departmentId);
    }
    deleteDepartment(departmentId) {
        return this.department.deleteDepartment(departmentId);
    }
    addEmployeeToDepartment(departmentId, dto) {
        return this.department.addEmployeesToDepartment(dto, departmentId);
    }
    removeEmployeeFromDepartment(employeeId) {
        return this.department.removeEmployeeFromDepartment(employeeId);
    }
    async addEmployee(dto, user) {
        await this.employee.addEmployee(dto, user.company_id);
    }
    getEmployee(user) {
        return this.employee.getEmployees(user.company_id);
    }
    getEmployeeSummary(user) {
        return this.employee.getEmployeesSummary(user.company_id);
    }
    getActiveEmployees(user) {
        return this.employee.getEmployeeByUserId(user.id);
    }
    getEmployeeById(employeeId) {
        return this.employee.getEmployeeById(employeeId);
    }
    getEmployeesByDepartment(departmentId) {
        return this.employee.getEmployeesByDepartment(departmentId);
    }
    updateEmployee(dto, employeeId) {
        return this.employee.updateEmployee(employeeId, dto);
    }
    deleteEmployee(employeeId) {
        return this.employee.deleteEmployee(employeeId);
    }
    async addEmployees(file, user) {
        const filePath = (0, path_1.join)(process.cwd(), 'src/organization/temp', file.filename);
        const employees = [];
        return new Promise((resolve, reject) => {
            (0, fs_1.createReadStream)(filePath)
                .pipe(csvParser())
                .on('data', (row) => {
                employees.push(this.transformRowWithMapping(row));
            })
                .on('end', async () => {
                try {
                    const dtos = await this.validateAndMapToDto(employees);
                    const result = await this.employee.addMultipleEmployees(dtos, user.company_id);
                    await (0, promises_1.unlink)(filePath);
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            })
                .on('error', (error) => reject(error));
        });
    }
    transformRowWithMapping(row) {
        const transformedRow = {};
        for (const [key, value] of Object.entries(row)) {
            const mappedKey = this.fieldMapping[key.trim()];
            if (mappedKey) {
                transformedRow[mappedKey] = value;
            }
        }
        return this.transformRow(transformedRow);
    }
    transformRow(row) {
        return {
            ...row,
            employee_number: Number(row.employee_number),
            annual_gross: row.annual_gross ? Number(row.annual_gross) : null,
            hourly_rate: row.hourly_rate ? Number(row.hourly_rate) : null,
            bonus: row.bonus ? Number(row.bonus) : null,
            commission: row.commission ? Number(row.commission) : null,
            is_active: row.is_active === 'true' || row.is_active === '1',
            employment_status: row.employment_status,
        };
    }
    async validateAndMapToDto(rows) {
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(dto_1.CreateEmployeeDto, row);
            const errors = await (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                throw new common_1.BadRequestException('Please ensure the CSV file is formatted correctly. All The fields are required.');
            }
            dtos.push(dto);
        }
        return dtos;
    }
    createEmployeeBankDetails(dto, employeeId) {
        return this.employee.addEmployeeBankDetails(employeeId, dto);
    }
    updateEmployeeBankDetails(dto, employeeId) {
        return this.employee.updateEmployeeBankDetails(employeeId, dto);
    }
    createEmployeeTaxDetails(dto, employeeId) {
        return this.employee.addEmployeeTaxDetails(employeeId, dto);
    }
    updateEmployeeTaxDetails(dto, employeeId) {
        return this.employee.updateEmployeeTaxDetails(employeeId, dto);
    }
    createEmployeeGroup(dto, user) {
        return this.employee.createEmployeeGroup(user.company_id, dto);
    }
    getEmployeeGroups(user) {
        return this.employee.getEmployeeGroups(user.company_id);
    }
    getEmployeeGroup(groupId) {
        return this.employee.getEmployeeGroup(groupId);
    }
    updateEmployeeGroup(dto, groupId) {
        return this.employee.updateEmployeeGroup(groupId, dto);
    }
    deleteEmployeeGroup(groupId) {
        return this.employee.deleteEmployeeGroup(groupId);
    }
    getEmployeesInGroup(groupId) {
        return this.employee.getEmployeesInGroup(groupId);
    }
    addEmployeeToGroup(employees, groupId) {
        console.log(employees);
        return this.employee.addEmployeesToGroup(employees, groupId);
    }
    removeEmployeeFromGroup(employeeIds) {
        const obj = employeeIds;
        const employeeId = obj.employee_id;
        return this.employee.removeEmployeesFromGroup(employeeId);
    }
    verifyAccount(accountNumber, bankCode) {
        return this.employee.verifyBankAccount(accountNumber, bankCode);
    }
};
exports.OrganizationController = OrganizationController;
__decorate([
    (0, common_1.Post)('company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCompanyDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createCompany", null);
__decorate([
    (0, common_1.Get)('company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getCompany", null);
__decorate([
    (0, common_1.Put)('company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCompanyDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Delete)('company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "deleteCompany", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/contact'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateCompanyContactDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createCompanyContact", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/contact'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getCompanyContacts", null);
__decorate([
    (0, common_1.Put)('companies/:companyId/contact'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UpdateCompanyContactDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateCompanyContact", null);
__decorate([
    (0, common_1.Get)('pay-frequency'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getPayFrequency", null);
__decorate([
    (0, common_1.Put)('pay-frequency'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pay_frequency_dto_1.CreatePayFrequencyDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updatePayFrequency", null);
__decorate([
    (0, common_1.Post)('company-tax-details'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_tax_dto_1.CreateCompanyTaxDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createCompanyTaxDetails", null);
__decorate([
    (0, common_1.Get)('company-tax-details'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getCompanyTaxDetails", null);
__decorate([
    (0, common_1.Put)('company-tax-details'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_tax_dto_1.CreateCompanyTaxDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateCompanyTaxDetails", null);
__decorate([
    (0, common_1.Post)('departments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateDepartmentDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createDepartment", null);
__decorate([
    (0, common_1.Get)('departments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getDepartment", null);
__decorate([
    (0, common_1.Get)('department/:departmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getDepartmentById", null);
__decorate([
    (0, common_1.Put)('department/:departmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('departmentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateDepartment", null);
__decorate([
    (0, common_1.Delete)('department/:departmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "deleteDepartment", null);
__decorate([
    (0, common_1.Post)('departments/:departmentId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('departmentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "addEmployeeToDepartment", null);
__decorate([
    (0, common_1.Delete)('departments/:departmentId/employees/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "removeEmployeeFromDepartment", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "addEmployee", null);
__decorate([
    (0, common_1.Get)('employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployee", null);
__decorate([
    (0, common_1.Get)('employees-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeeSummary", null);
__decorate([
    (0, common_1.Get)('employee-active'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getActiveEmployees", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeeById", null);
__decorate([
    (0, common_1.Get)('employees/department/:departmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeesByDepartment", null);
__decorate([
    (0, common_1.Put)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UpdateEmployeeDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Delete)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "deleteEmployee", null);
__decorate([
    (0, common_1.Post)('employees/multiple'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "addEmployees", null);
__decorate([
    (0, common_1.Post)('employee/bank-details/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEmployeeBankDetailsDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createEmployeeBankDetails", null);
__decorate([
    (0, common_1.Put)('employee/bank-details/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEmployeeBankDetailsDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateEmployeeBankDetails", null);
__decorate([
    (0, common_1.Post)('employee/tax-details/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_tax_details_dto_1.CreateEmployeeTaxDetailsDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createEmployeeTaxDetails", null);
__decorate([
    (0, common_1.Put)('employee/tax-details/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_employee_tax_details_dto_1.UpdateEmployeeTaxDetailsDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateEmployeeTaxDetails", null);
__decorate([
    (0, common_1.Post)('employee-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateEmployeeGroupDto, Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "createEmployeeGroup", null);
__decorate([
    (0, common_1.Get)('employee-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeeGroups", null);
__decorate([
    (0, common_1.Get)('employee-group/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeeGroup", null);
__decorate([
    (0, common_1.Put)('employee-group/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UpdateEmployeeGroupDto, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "updateEmployeeGroup", null);
__decorate([
    (0, common_1.Delete)('employee-group/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "deleteEmployeeGroup", null);
__decorate([
    (0, common_1.Get)('employee-group/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "getEmployeesInGroup", null);
__decorate([
    (0, common_1.Post)('employee-group/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "addEmployeeToGroup", null);
__decorate([
    (0, common_1.Delete)('employee-group/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "removeEmployeeFromGroup", null);
__decorate([
    (0, common_1.Get)('verify-account/:accountNumber/:bankCode'),
    __param(0, (0, common_1.Param)('accountNumber')),
    __param(1, (0, common_1.Param)('bankCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OrganizationController.prototype, "verifyAccount", null);
exports.OrganizationController = OrganizationController = __decorate([
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [services_1.CompanyService,
        services_1.DepartmentService,
        services_1.EmployeeService])
], OrganizationController);
//# sourceMappingURL=organization.controller.js.map