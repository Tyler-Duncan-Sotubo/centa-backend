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
exports.PerformanceExportService = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const export_util_1 = require("../../../utils/export.util");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
let PerformanceExportService = class PerformanceExportService {
    constructor(reportService, s3Service) {
        this.reportService = reportService;
        this.s3Service = s3Service;
    }
    async exportTopEmployeesToS3(user, filters) {
        const result = await this.reportService.getTopEmployees(user, filters);
        const exportData = result.map((r) => ({
            name: r.employeeName,
            department: r.departmentName,
            jobRole: r.jobRoleName,
            finalScore: r.finalScore,
            promotionRecommendation: r.promotionRecommendation ?? 'N/A',
        }));
        const filename = `top_employees_${user.companyId}_${filters.cycleType}`;
        const path = await export_util_1.ExportUtil.exportToCSV(exportData, [
            { field: 'name', title: 'Employee Name' },
            { field: 'department', title: 'Department' },
            { field: 'jobRole', title: 'Job Role' },
            { field: 'finalScore', title: 'Score' },
            { field: 'promotionRecommendation', title: 'Recommendation' },
        ], filename);
        return this.s3Service.uploadFilePath(path, user.companyId, 'performance', 'top');
    }
    async exportGoalReportToCSV(user, filters) {
        const report = await this.reportService.getGoalReport(user, filters);
        const csvData = report.map((goal) => ({
            goalId: goal.goalId,
            employeeId: goal.employeeId,
            employeeName: goal.employeeName,
            department: goal.departmentName,
            jobRole: goal.jobRoleName,
            title: goal.title,
            description: goal.description,
            type: goal.type,
            status: goal.status,
            weight: goal.weight,
            startDate: goal.startDate,
            dueDate: goal.dueDate,
        }));
        const filePath = await export_util_1.ExportUtil.exportToCSV(csvData, [
            { field: 'goalId', title: 'Goal ID' },
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'department', title: 'Department' },
            { field: 'jobRole', title: 'Job Role' },
            { field: 'title', title: 'Goal Title' },
            { field: 'description', title: 'Description' },
            { field: 'type', title: 'Type' },
            { field: 'status', title: 'Status' },
            { field: 'weight', title: 'Weight' },
            { field: 'startDate', title: 'Start Date' },
            { field: 'dueDate', title: 'Due Date' },
        ], `goal_report`);
        return this.s3Service.uploadFilePath(filePath, user.companyId, 'reports', 'goals');
    }
    async exportFeedbackReportToCSV(user, filters) {
        const report = await this.reportService.getFeedbackReport(user, filters);
        const csvData = report.flatMap((item) => item.responses.map((r) => ({
            employeeId: item.recipientId,
            employeeName: item.employeeName,
            isAnonymous: item.isAnonymous ? 'Yes' : 'No',
            submittedAt: item.submittedAt,
            questionText: r.questionText,
            answer: r.answer,
        })));
        const filePath = await export_util_1.ExportUtil.exportToCSV(csvData, [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'submittedAt', title: 'Submitted At' },
            { field: 'isAnonymous', title: 'Anonymous?' },
            { field: 'questionText', title: 'Question Text' },
            { field: 'answer', title: 'Answer' },
        ], `feedback_report_${filters.type}`);
        return this.s3Service.uploadFilePath(filePath, user.companyId, 'reports', 'feedback');
    }
    async exportAssessmentSummaryToCSV(user, filters) {
        const report = await this.reportService.getAssessmentReportSummary(user, filters);
        const csvData = report.map((entry) => ({
            assessmentId: entry.id,
            employeeId: entry.employeeId,
            employeeName: entry.revieweeName,
            reviewerName: entry.reviewerName,
            department: entry.departmentName,
            type: entry.type,
            status: entry.status,
            submittedAt: entry.submittedAt,
            score: entry.finalScore,
            recommendation: entry.promotionRecommendation,
            potential: entry.potentialFlag ? 'Yes' : 'No',
        }));
        const filePath = await export_util_1.ExportUtil.exportToCSV(csvData, [
            { field: 'assessmentId', title: 'Assessment ID' },
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'reviewerName', title: 'Reviewer Name' },
            { field: 'department', title: 'Department' },
            { field: 'type', title: 'Assessment Type' },
            { field: 'status', title: 'Status' },
            { field: 'submittedAt', title: 'Submitted At' },
            { field: 'score', title: 'Final Score' },
            { field: 'recommendation', title: 'Recommendation' },
            { field: 'potential', title: 'High Potential' },
        ], `assessment_summary`);
        return this.s3Service.uploadFilePath(filePath, user.companyId, 'reports', 'assessments');
    }
};
exports.PerformanceExportService = PerformanceExportService;
exports.PerformanceExportService = PerformanceExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        s3_storage_service_1.S3StorageService])
], PerformanceExportService);
//# sourceMappingURL=csv-performance-export.service.js.map