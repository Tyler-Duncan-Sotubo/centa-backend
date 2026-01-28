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
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const get_appraisal_report_dto_1 = require("./dto/get-appraisal-report.dto");
const get_goal_report_dto_1 = require("./dto/get-goal-report.dto");
const get_feedback_report_dto_1 = require("./dto/get-feedback-report.dto");
const get_assessment_report_dto_1 = require("./dto/get-assessment-report.dto");
const get_top_employees_dto_1 = require("./dto/get-top-employees.dto");
const csv_performance_export_service_1 = require("./csv-performance-export.service");
const performance_pdf_export_service_1 = require("./performance-pdf-export.service");
let ReportController = class ReportController extends base_controller_1.BaseController {
    constructor(reportService, csv, pdf) {
        super();
        this.reportService = reportService;
        this.csv = csv;
        this.pdf = pdf;
    }
    async getOverview(user) {
        return this.reportService.getPerformanceOverview(user);
    }
    async getReportsFilters(user) {
        return this.reportService.reportFilters(user.companyId);
    }
    async getAppraisalReport(user, cycleId, filter) {
        return this.reportService.getAppraisalReport(user, filter);
    }
    async getGoalReport(user, filter) {
        return this.reportService.getGoalReport(user, filter);
    }
    async getFeedbackReport(user, filter) {
        return this.reportService.getFeedbackReport(user, filter);
    }
    async getAssessmentReport(user, filter) {
        return this.reportService.getAssessmentReportSummary(user, filter);
    }
    async getTopEmployees(user, filter) {
        return this.reportService.getTopEmployees(user, filter);
    }
    async getCompetencyHeatmap(user, filters) {
        return this.reportService.getCompetencyHeatmap(user, filters);
    }
    async exportAppraisalReport(user, format = 'csv', filters) {
        const url = format === 'pdf'
            ? await this.pdf.exportAppraisalReportToPDF(user, filters)
            : await this.csv.exportAppraisalReportToS3(user, filters);
        return { url };
    }
    async exportTopEmployees(user, filters, format = 'csv') {
        const url = format === 'pdf'
            ? await this.pdf.exportTopEmployeesToPDF(user, filters)
            : await this.csv.exportTopEmployeesToS3(user, filters);
        return { url };
    }
    async exportCompetencyHeatmap(user, cycleId, format = 'csv') {
        const url = format === 'pdf'
            ? await this.pdf.exportCompetencyHeatmapToPDF(user, cycleId)
            : await this.csv.exportCompetencyHeatmapToS3(user, cycleId);
        return { url };
    }
    async exportGoalReport(user, cycleId, format = 'csv', filters) {
        const url = format === 'pdf'
            ? await this.pdf.exportGoalReportToPDF(user, filters)
            : await this.csv.exportGoalReportToCSV(user, filters);
        return { url };
    }
    async exportFeedbackReport(user, filters, format = 'csv') {
        const url = format === 'pdf'
            ? await this.pdf.exportFeedbackReportToPDF(user, filters)
            : await this.csv.exportFeedbackReportToCSV(user, filters);
        return { url };
    }
    async exportAssessmentReport(user, format = 'csv', filters) {
        const url = format === 'pdf'
            ? await this.pdf.exportAssessmentSummaryToPDF(user, filters)
            : await this.csv.exportAssessmentSummaryToCSV(user, filters);
        return { url };
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('reports-filters'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getReportsFilters", null);
__decorate([
    (0, common_1.Get)('appraisal-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('cycleId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, get_appraisal_report_dto_1.GetAppraisalReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAppraisalReport", null);
__decorate([
    (0, common_1.Get)('goal-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_goal_report_dto_1.GetGoalReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getGoalReport", null);
__decorate([
    (0, common_1.Get)('feedback-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_feedback_report_dto_1.GetFeedbackReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getFeedbackReport", null);
__decorate([
    (0, common_1.Get)('assessment-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_assessment_report_dto_1.GetAssessmentReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAssessmentReport", null);
__decorate([
    (0, common_1.Get)('top-employees'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_top_employees_dto_1.GetTopEmployeesDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getTopEmployees", null);
__decorate([
    (0, common_1.Get)('competency-heatmap'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCompetencyHeatmap", null);
__decorate([
    (0, common_1.Get)('export-appraisal-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, get_appraisal_report_dto_1.GetAppraisalReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportAppraisalReport", null);
__decorate([
    (0, common_1.Get)('export-top-employees'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_top_employees_dto_1.GetTopEmployeesDto, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportTopEmployees", null);
__decorate([
    (0, common_1.Get)('export-competency-heatmap'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('cycleId')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportCompetencyHeatmap", null);
__decorate([
    (0, common_1.Get)('export-goal-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('cycleId')),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, get_goal_report_dto_1.GetGoalReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportGoalReport", null);
__decorate([
    (0, common_1.Get)('export-feedback-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_feedback_report_dto_1.GetFeedbackReportDto, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportFeedbackReport", null);
__decorate([
    (0, common_1.Get)('export-assessment-report'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, get_assessment_report_dto_1.GetAssessmentReportDto]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "exportAssessmentReport", null);
exports.ReportController = ReportController = __decorate([
    (0, common_1.Controller)('performance-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['performance.settings']),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        csv_performance_export_service_1.PerformanceExportService,
        performance_pdf_export_service_1.PerformancePdfExportService])
], ReportController);
//# sourceMappingURL=report.controller.js.map