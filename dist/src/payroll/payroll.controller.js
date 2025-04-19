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
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const payroll_service_1 = require("./services/payroll.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const dto_1 = require("./dto");
const deduction_service_1 = require("./services/deduction.service");
const payslip_service_1 = require("./services/payslip.service");
const fs = require("fs");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const base_controller_1 = require("../config/base.controller");
const tax_service_1 = require("./services/tax.service");
const pdf_service_1 = require("./services/pdf.service");
const update_tax_config_dto_1 = require("./dto/update-tax-config.dto");
const pay_group_service_1 = require("./services/pay-group.service");
const create_employee_group_dto_1 = require("./dto/create-employee-group.dto");
const update_employee_group_dto_1 = require("./dto/update-employee-group.dto");
const audit_interceptor_1 = require("../audit/audit.interceptor");
const audit_decorator_1 = require("../audit/audit.decorator");
let PayrollController = class PayrollController extends base_controller_1.BaseController {
    constructor(payrollService, deductionService, payslipService, taxService, pdfService, payGroup) {
        super();
        this.payrollService = payrollService;
        this.deductionService = deductionService;
        this.payslipService = payslipService;
        this.taxService = taxService;
        this.pdfService = pdfService;
        this.payGroup = payGroup;
        this.formattedDate = () => {
            const date = new Date();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${year}-${month}`;
            return formattedDate;
        };
    }
    async getTaxConfiguration(user) {
        return this.deductionService.getTaxConfiguration(user.company_id);
    }
    async updateTaxConfiguration(user, dto) {
        return this.deductionService.updateTaxConfiguration(user.company_id, dto);
    }
    async createCustomDeduction(user, dto) {
        return this.deductionService.createCustomDeduction(user.company_id, dto);
    }
    async getCustomDeduction(user) {
        return this.deductionService.fetchCustomDeduction(user.company_id);
    }
    async updateCustomDeduction(user, dto, id) {
        return this.deductionService.updateCustomDeduction(user.company_id, dto, id);
    }
    async deleteCustomDeduction(id) {
        return this.deductionService.deleteCustomDeduction(id);
    }
    async calculatePayrollForCompany(user) {
        return this.payrollService.calculatePayrollForCompany(user.company_id, `${this.formattedDate()}`);
    }
    async getPayrollSummary(user) {
        return this.payrollService.getPayrollSummary(user.company_id);
    }
    async getCompanyPayrollStatus(user) {
        return this.payrollService.getPayrollStatus(user.company_id);
    }
    async deleteCompanyPayroll(user, id, status) {
        return this.payrollService.updatePayrollApprovalStatus(user.company_id, id, status);
    }
    async updatePayrollPaymentStatus(user, id, status) {
        return this.payrollService.updatePayrollPaymentStatus(user.company_id, id, status);
    }
    async deleteCompanyPayrollById(user, id) {
        return this.payrollService.deletePayroll(user.company_id, id);
    }
    async getCompanyBonuses(user) {
        return this.payrollService.getBonuses(user.company_id);
    }
    async createCompanyBonus(user, dto) {
        return this.payrollService.createBonus(user.company_id, dto);
    }
    async deleteCompanyBonuses(user, id) {
        return this.payrollService.deleteBonus(user.company_id, id);
    }
    async getEmployeeBonuses(user, employeeId) {
        return this.payrollService.getEmployeeBonuses(user.company_id, employeeId);
    }
    async getCompanyPayslips(user, id) {
        return this.payslipService.getCompanyPayslipsById(user.company_id, id);
    }
    async downloadPayslipCSV(user, id, format = 'internal', res) {
        try {
            const filePath = await this.payslipService.DownloadCompanyPayslipsByMonth(user.company_id, id, format);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="payslips-${id}.csv"`);
            if (filePath) {
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
                fileStream.on('close', () => {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting file:', err);
                        }
                        else {
                            console.log(`Deleted file: ${filePath}`);
                        }
                    });
                });
            }
            else {
                res.status(404).send({ message: 'File not found' });
            }
        }
        catch (error) {
            res.status(500).send({ message: error.message });
        }
    }
    async getEmployeePayslipSummary(employeeId) {
        return this.payslipService.getEmployeePayslipSummary(employeeId);
    }
    async getEmployeePayslips(employeeId, user) {
        return this.payslipService.getEmployeePayslipSummary(user.id);
    }
    async getEmployeePayslip(payslipId) {
        return this.payslipService.getEmployeePayslip(payslipId);
    }
    async getSalaryBreakdown(user) {
        return this.payrollService.getSalaryBreakdown(user.company_id);
    }
    async createSalaryBreakdown(user, dto) {
        return this.payrollService.createUpdateSalaryBreakdown(user.company_id, dto);
    }
    async deleteSalaryBreakdown(user, id) {
        return this.payrollService.deleteSalaryBreakdown(user.company_id, id);
    }
    async getCompanyTaxFilings(user) {
        return this.taxService.getCompanyTaxFilings(user.company_id);
    }
    async updateCompanyTaxFilings(id, status) {
        return this.taxService.updateCompanyTaxFilings(id, status);
    }
    async downloadExcel(tax_filing_id, res) {
        try {
            const buffer = await this.taxService.generateTaxFilingExcel(tax_filing_id);
            res.setHeader('Content-Disposition', `attachment; filename=tax_filing_${tax_filing_id}.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        }
        catch (error) {
            res
                .status(500)
                .json({ message: 'Error generating Excel file', error: error.message });
        }
    }
    createEmployeeGroup(dto, user) {
        return this.payGroup.createEmployeeGroup(user.company_id, dto);
    }
    getEmployeeGroups(user) {
        return this.payGroup.getEmployeeGroups(user.company_id);
    }
    getEmployeeGroup(groupId) {
        return this.payGroup.getEmployeeGroup(groupId);
    }
    updateEmployeeGroup(dto, groupId) {
        return this.payGroup.updateEmployeeGroup(groupId, dto);
    }
    deleteEmployeeGroup(groupId) {
        return this.payGroup.deleteEmployeeGroup(groupId);
    }
    getEmployeesInGroup(groupId) {
        return this.payGroup.getEmployeesInGroup(groupId);
    }
    addEmployeeToGroup(employees, groupId) {
        return this.payGroup.addEmployeesToGroup(employees, groupId);
    }
    removeEmployeeFromGroup(employeeIds) {
        const obj = employeeIds;
        const employeeId = obj.employee_id;
        return this.payGroup.removeEmployeesFromGroup(employeeId);
    }
    async getPayrollPreview(user) {
        return this.payrollService.getPayrollPreviewDetails(user.company_id);
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)('tax-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getTaxConfiguration", null);
__decorate([
    (0, common_1.Put)('tax-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, audit_decorator_1.Audit)({ action: 'Created Tax Config', entity: 'Remittance' }),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_tax_config_dto_1.updateTaxConfigurationDto]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updateTaxConfiguration", null);
__decorate([
    (0, common_1.Post)('custom-deduction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Created Custom Deduction', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateCustomDeduction]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createCustomDeduction", null);
__decorate([
    (0, common_1.Get)('custom-deduction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCustomDeduction", null);
__decorate([
    (0, common_1.Put)('custom-deduction/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Updated Custom Deduction', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdateCustomDeductionDto, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updateCustomDeduction", null);
__decorate([
    (0, common_1.Delete)('custom-deduction/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteCustomDeduction", null);
__decorate([
    (0, common_1.Post)('calculate-payroll-for-company'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Payroll Run', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "calculatePayrollForCompany", null);
__decorate([
    (0, common_1.Get)('company-payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayrollSummary", null);
__decorate([
    (0, common_1.Get)('company-payroll-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCompanyPayrollStatus", null);
__decorate([
    (0, common_1.Put)('company-payroll/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Updated Payroll Approval Status', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteCompanyPayroll", null);
__decorate([
    (0, common_1.Put)('company-payroll-payment-status/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Updated Payroll Payment Status', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updatePayrollPaymentStatus", null);
__decorate([
    (0, common_1.Delete)('company-payroll/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Payroll', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteCompanyPayrollById", null);
__decorate([
    (0, common_1.Get)('company-bonuses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCompanyBonuses", null);
__decorate([
    (0, common_1.Post)('company-bonuses'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Created Bonus', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.createBonusDto]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createCompanyBonus", null);
__decorate([
    (0, common_1.Delete)('company-bonuses/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Bonus', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteCompanyBonuses", null);
__decorate([
    (0, common_1.Get)('employee-bonuses/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getEmployeeBonuses", null);
__decorate([
    (0, common_1.Get)('payslips/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCompanyPayslips", null);
__decorate([
    (0, common_1.Get)('payslip-download/:id/:format'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Downloaded Payslip', entity: 'Payslip' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('format')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "downloadPayslipCSV", null);
__decorate([
    (0, common_1.Get)('employee-payslip-summary/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getEmployeePayslipSummary", null);
__decorate([
    (0, common_1.Get)('employee-payslip'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getEmployeePayslips", null);
__decorate([
    (0, common_1.Get)('employee-payslip/:payslipId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee', 'hr_manager']),
    __param(0, (0, common_1.Param)('payslipId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getEmployeePayslip", null);
__decorate([
    (0, common_1.Get)('salary-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getSalaryBreakdown", null);
__decorate([
    (0, common_1.Post)('salary-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Created Salary Breakdown', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createSalaryBreakdown", null);
__decorate([
    (0, common_1.Delete)('salary-breakdown/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Salary Breakdown', entity: 'Payroll' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteSalaryBreakdown", null);
__decorate([
    (0, common_1.Get)('tax-filings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCompanyTaxFilings", null);
__decorate([
    (0, common_1.Put)('tax-filings/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Update Company Tax Filings', entity: 'Tax' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updateCompanyTaxFilings", null);
__decorate([
    (0, common_1.Get)('tax-filings-download/:id/'),
    (0, audit_decorator_1.Audit)({ action: 'Download Company Tax Filing', entity: 'Tax' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "downloadExcel", null);
__decorate([
    (0, common_1.Post)('pay-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({ action: 'Created Employee Group', entity: 'Payroll' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_group_dto_1.CreateEmployeeGroupDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "createEmployeeGroup", null);
__decorate([
    (0, common_1.Get)('pay-groups'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager', 'employee']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getEmployeeGroups", null);
__decorate([
    (0, common_1.Get)('pay-groups/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getEmployeeGroup", null);
__decorate([
    (0, common_1.Put)('pay-groups/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({ action: 'Updated Employee Group', entity: 'Payroll' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_employee_group_dto_1.UpdateEmployeeGroupDto, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "updateEmployeeGroup", null);
__decorate([
    (0, common_1.Delete)('pay-groups/:groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Employee Group', entity: 'Payroll' }),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "deleteEmployeeGroup", null);
__decorate([
    (0, common_1.Get)('pay-groups/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getEmployeesInGroup", null);
__decorate([
    (0, common_1.Post)('pay-groups/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({ action: 'Added Employee To Group', entity: 'Payroll' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "addEmployeeToGroup", null);
__decorate([
    (0, common_1.Delete)('pay-groups/:groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Employee From Group', entity: 'Payroll' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "removeEmployeeFromGroup", null);
__decorate([
    (0, common_1.Get)('payroll-preview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayrollPreview", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService,
        deduction_service_1.DeductionService,
        payslip_service_1.PayslipService,
        tax_service_1.TaxService,
        pdf_service_1.PdfService,
        pay_group_service_1.PayGroupService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map