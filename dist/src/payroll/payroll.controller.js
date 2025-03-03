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
let PayrollController = class PayrollController extends base_controller_1.BaseController {
    constructor(payrollService, deductionService, payslipService, taxService, pdfService) {
        super();
        this.payrollService = payrollService;
        this.deductionService = deductionService;
        this.payslipService = payslipService;
        this.taxService = taxService;
        this.pdfService = pdfService;
        this.formattedDate = () => {
            const date = new Date();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${year}-${month}`;
            return formattedDate;
        };
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
        console.log(id);
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
    async getEmployeePayslip(payslipId) {
        return this.payslipService.getEmployeePayslip(payslipId);
    }
    async getSalaryBreakdown(user) {
        return this.payrollService.getSalaryBreakdown(user.company_id);
    }
    async createSalaryBreakdown(user, dto) {
        return this.payrollService.createSalaryBreakdown(user.company_id, dto);
    }
    async deleteSalaryBreakdown(user) {
        return this.payrollService.deleteSalaryBreakdown(user.company_id);
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
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Put)('tax-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
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
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "deleteCompanyBonuses", null);
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
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getSalaryBreakdown", null);
__decorate([
    (0, common_1.Post)('salary-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createSalaryBreakdown", null);
__decorate([
    (0, common_1.Delete)('salary-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updateCompanyTaxFilings", null);
__decorate([
    (0, common_1.Get)('tax-filings-download/:id/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "downloadExcel", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService,
        deduction_service_1.DeductionService,
        payslip_service_1.PayslipService,
        tax_service_1.TaxService,
        pdf_service_1.PdfService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map