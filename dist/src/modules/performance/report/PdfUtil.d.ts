export declare class PdfUtil {
    static generatePdf(html: string): Promise<Buffer>;
    static wrapHtml(title: string, body: string): string;
    static renderAppraisalReportHtml(data: any[]): string;
    static renderTopEmployeesHtml(data: any[]): string;
    static renderHeatmapHtml(heatmap: Record<string, Record<string, number>>): string;
    static renderGoalReportHtml(data: any[]): string;
    static renderFeedbackReportHtml(data: any[]): string;
    static renderAssessmentSummaryHtml(data: any[]): string;
}
