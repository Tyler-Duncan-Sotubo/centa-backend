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
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const generate_report_service_1 = require("./generate-report.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let ReportController = class ReportController extends base_controller_1.BaseController {
    constructor(reportService, generateReportService) {
        super();
        this.reportService = reportService;
        this.generateReportService = generateReportService;
    }
    async getGlSummary(user, month) {
        return this.generateReportService.generateGLSummaryFromPayroll(user.companyId, month);
    }
    async getPayrollVariance(user) {
        return this.reportService.getLatestPayrollSummaryWithVariance(user.companyId);
    }
    async getEmployeeVariance(user) {
        return this.reportService.getEmployeePayrollVariance(user.companyId);
    }
    async getPayrollSummary(user, month) {
        return this.reportService.getPayrollDashboard(user.companyId, month);
    }
    async getCombinedPayroll(user) {
        return this.reportService.getCombinedPayroll(user.companyId);
    }
    async getPayrollAnalyticsReport(user, month) {
        return this.reportService.getPayrollAnalyticsReport(user.companyId, month);
    }
    async getCostByPayGroup(user, month) {
        return this.reportService.getPayrollCostReport(user.companyId, month);
    }
    async getTopBonusRecipients(user, month, limit = 10) {
        return this.reportService.getTopBonusRecipients(user.companyId, month, Number(limit));
    }
    async getVarianceReport(user) {
        return this.generateReportService.getPayrollVarianceMatrices(user.companyId);
    }
    async getLoanSummaryReport(user) {
        return await this.reportService.getLoanFullReport(user.companyId);
    }
    async getLoanRepaymentReport(user) {
        return await this.reportService.getLoanRepaymentReport(user.companyId);
    }
    async getDeductionsSummary(user, month) {
        return this.reportService.getDeductionsSummary(user.companyId, month);
    }
    async downloadPaymentAdvice(user, id, format = 'internal') {
        const url = await this.generateReportService.downloadPayslipsToS3(user.companyId, id, format);
        return { url };
    }
    async generateGLSummary(user, month) {
        const url = await this.generateReportService.generateGLSummaryFromPayrollToS3(user.companyId, month);
        return { url };
    }
    async downloadYTD(user, format = 'csv') {
        const url = await this.generateReportService.downloadYtdPayslipsToS3(user.companyId, format);
        return { url };
    }
    async downloadCompanyVariance(user) {
        const url = await this.generateReportService.generateCompanyPayrollVarianceReportToS3(user.companyId);
        return { url };
    }
    async downloadEmployeeVariance(user) {
        const url = await this.generateReportService.generateEmployeeMatrixVarianceReportToS3(user.companyId);
        return { url };
    }
    async downloadPayrollDashboard(user) {
        const url = await this.generateReportService.generatePayrollDashboardReportToS3(user.companyId);
        return { url };
    }
    async downloadRunSummaries(user, month) {
        const url = await this.generateReportService.generateRunSummariesReportToS3(user.companyId, month);
        return { url };
    }
    async downloadEmployeeDeductions(user, month, format = 'csv') {
        const url = await this.generateReportService.generateDeductionsByEmployeeReportToS3(user.companyId, month, format);
        return { url };
    }
    async downloadCostByPayGroup(user, month) {
        const url = await this.generateReportService.generateCostByPayGroupReportToS3(user.companyId, month);
        return { url };
    }
    async downloadCostByDepartment(user, month, format = 'csv') {
        const url = await this.generateReportService.generateCostByDepartmentReportToS3(user.companyId, month, format);
        return { url };
    }
    async downloadTopBonusRecipients(user, month, limit) {
        const url = await this.generateReportService.generateTopBonusRecipientsReportToS3(user.companyId, month, limit ? Number(limit) : undefined);
        return { url };
    }
    async downloadLoanSummaryReport(user) {
        const url = await this.generateReportService.generateLoanSummaryReportToS3(user.companyId);
        return { url };
    }
    async downloadLoanRepaymentReport(user, month, format = 'csv') {
        const url = await this.generateReportService.generateLoanRepaymentReportToS3(user.companyId, format, month);
        return { url };
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('gl-summary-from-payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getGlSummary", null);
__decorate([
    (0, common_1.Get)('company-payroll-variance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getPayrollVariance", null);
__decorate([
    (0, common_1.Get)('employee-payroll-variance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getEmployeeVariance", null);
__decorate([
    (0, common_1.Get)('company-payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getPayrollSummary", null);
__decorate([
    (0, common_1.Get)('payroll-preview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCombinedPayroll", null);
__decorate([
    (0, common_1.Get)('analytics-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getPayrollAnalyticsReport", null);
__decorate([
    (0, common_1.Get)('payroll-cost'),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCostByPayGroup", null);
__decorate([
    (0, common_1.Get)('top-bonus-recipients'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getTopBonusRecipients", null);
__decorate([
    (0, common_1.Get)('company-variance-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getVarianceReport", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLoanSummaryReport", null);
__decorate([
    (0, common_1.Get)('repayment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLoanRepaymentReport", null);
__decorate([
    (0, common_1.Get)('deductions-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getDeductionsSummary", null);
__decorate([
    (0, common_1.Get)('payment-advice/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadPaymentAdvice", null);
__decorate([
    (0, common_1.Get)('gen-gl-summary-from-payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "generateGLSummary", null);
__decorate([
    (0, common_1.Get)('gen-company-ytd'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadYTD", null);
__decorate([
    (0, common_1.Get)('gen-company-variance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadCompanyVariance", null);
__decorate([
    (0, common_1.Get)('gen-employee-variance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadEmployeeVariance", null);
__decorate([
    (0, common_1.Get)('gen-payroll-dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadPayrollDashboard", null);
__decorate([
    (0, common_1.Get)('gen-run-summaries'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadRunSummaries", null);
__decorate([
    (0, common_1.Get)('gen-employee-deductions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadEmployeeDeductions", null);
__decorate([
    (0, common_1.Get)('gen-cost-by-paygroup'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadCostByPayGroup", null);
__decorate([
    (0, common_1.Get)('gen-cost-by-department'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadCostByDepartment", null);
__decorate([
    (0, common_1.Get)('gen-top-bonus-recipients'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadTopBonusRecipients", null);
__decorate([
    (0, common_1.Get)('gen-loan-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadLoanSummaryReport", null);
__decorate([
    (0, common_1.Get)('gen-loan-repayment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.reports.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadLoanRepaymentReport", null);
exports.ReportController = ReportController = __decorate([
    (0, common_1.Controller)('payroll-report'),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        generate_report_service_1.GenerateReportService])
], ReportController);
//# sourceMappingURL=report.controller.js.map