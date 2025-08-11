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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformancePdfExportService = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const aws_service_1 = require("../../../common/aws/aws.service");
const PdfUtil_1 = require("./PdfUtil");
let PerformancePdfExportService = class PerformancePdfExportService {
    constructor(reportService, awsService) {
        this.reportService = reportService;
        this.awsService = awsService;
        this.date = new Date();
        this.formattedDate = this.date.toISOString().split('T')[0];
    }
    async exportAppraisalReportToPDF(user, filters) {
        const report = await this.reportService.getAppraisalReport(user, filters);
        const html = PdfUtil_1.PdfUtil.renderAppraisalReportHtml(report);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/appraisal/appraisal_report_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
    async exportTopEmployeesToPDF(user, filters) {
        const result = await this.reportService.getTopEmployees(user, filters);
        const html = PdfUtil_1.PdfUtil.renderTopEmployeesHtml(result);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/top/top_employees_${filters.cycleType}_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
    async exportCompetencyHeatmapToPDF(user, cycleId) {
        const heatmap = await this.reportService.getCompetencyHeatmap(user, {
            cycleId,
        });
        const validHeatmap = Array.isArray(heatmap)
            ? {}
            : heatmap;
        const html = PdfUtil_1.PdfUtil.renderHeatmapHtml(validHeatmap);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/heatmap/competency_heatmap_${cycleId}_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
    async exportGoalReportToPDF(user, filters) {
        const report = await this.reportService.getGoalReport(user, filters);
        const html = PdfUtil_1.PdfUtil.renderGoalReportHtml(report);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/goals/goal_report_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
    async exportFeedbackReportToPDF(user, filters) {
        const report = await this.reportService.getFeedbackReport(user, filters);
        const html = PdfUtil_1.PdfUtil.renderFeedbackReportHtml(report);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/feedback/feedback_report_${filters.type}_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
    async exportAssessmentSummaryToPDF(user, filters) {
        const report = await this.reportService.getAssessmentReportSummary(user, filters);
        const html = PdfUtil_1.PdfUtil.renderAssessmentSummaryHtml(report);
        const pdfBuffer = await PdfUtil_1.PdfUtil.generatePdf(html);
        const key = `performance/assessments/assessment_summary_${this.formattedDate}.pdf`;
        return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
    }
};
exports.PerformancePdfExportService = PerformancePdfExportService;
exports.PerformancePdfExportService = PerformancePdfExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        aws_service_1.AwsService])
], PerformancePdfExportService);
//# sourceMappingURL=performance-pdf-export.service.js.map