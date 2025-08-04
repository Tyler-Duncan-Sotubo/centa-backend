"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfUtil = void 0;
const playwright_chromium_1 = require("playwright-chromium");
class PdfUtil {
    static async generatePdf(html) {
        const browser = await playwright_chromium_1.chromium.launch({ headless: true });
        const page = await (await browser.newContext()).newPage();
        await page.setContent(html, { waitUntil: 'load' });
        const buffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '20mm', left: '10mm', right: '10mm' },
        });
        await browser.close();
        return buffer;
    }
    static wrapHtml(title, body) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${body}
        </body>
      </html>
    `;
    }
    static renderAppraisalReportHtml(data) {
        const rows = data
            .map((r) => `
      <tr>
        <td>${r.employeeName}</td>
        <td>${r.departmentName}</td>
        <td>${r.jobRoleName}</td>
        <td>${r.appraisalScore ?? 'N/A'}</td>
        <td>${r.promotionRecommendation ?? 'N/A'}</td>
        <td>${r.appraisalNote?.replace(/<\/?[^>]+(>|$)/g, '') ?? ''}</td>
      </tr>
    `)
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Job Role</th>
            <th>Score</th>
            <th>Recommendation</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml('Appraisal Report', table);
    }
    static renderTopEmployeesHtml(data) {
        const rows = data
            .map((r) => `
      <tr>
        <td>${r.employeeName}</td>
        <td>${r.departmentName}</td>
        <td>${r.jobRoleName}</td>
        <td>${r.finalScore}</td>
        <td>${r.promotionRecommendation ?? 'N/A'}</td>
      </tr>
    `)
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Job Role</th>
            <th>Score</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml('Top Employees Report', table);
    }
    static renderHeatmapHtml(heatmap) {
        const rows = Object.entries(heatmap)
            .flatMap(([competency, levels]) => Object.entries(levels).map(([level, count]) => `
        <tr>
          <td>${competency}</td>
          <td>${level}</td>
          <td>${count}</td>
        </tr>
      `))
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Competency</th>
            <th>Level</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml('Competency Heatmap', table);
    }
    static renderGoalReportHtml(data) {
        const rows = data
            .map((g) => `
      <tr>
        <td>${g.employeeName}</td>
        <td>${g.departmentName}</td>
        <td>${g.jobRoleName}</td>
        <td>${g.title}</td>
        <td>${g.status}</td>
        <td>${g.weight}</td>
        <td>${g.startDate}</td>
        <td>${g.dueDate}</td>
      </tr>
    `)
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Job Role</th>
            <th>Title</th>
            <th>Status</th>
            <th>Weight</th>
            <th>Start Date</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml('Goal Report', table);
    }
    static renderFeedbackReportHtml(data) {
        const rows = data
            .flatMap((item) => item.responses.map((r) => `
        <tr>
          <td>${item.employeeName}</td>
          <td>${item.submittedAt}</td>
          <td>${item.isAnonymous ? 'Yes' : 'No'}</td>
          <td>${r.questionText}</td>
          <td>${r.answer}</td>
        </tr>
      `))
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Submitted At</th>
            <th>Anonymous</th>
            <th>Question Text</th>
            <th>Answer</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml(`Feedback Report:`, table);
    }
    static renderAssessmentSummaryHtml(data) {
        const rows = data
            .map((a) => `
      <tr>
        <td>${a.revieweeName}</td>
        <td>${a.reviewerName}</td>
        <td>${a.departmentName}</td>
        <td>${a.type}</td>
        <td>${a.status}</td>
        <td>${a.submittedAt}</td>
        <td>${a.finalScore ?? 'N/A'}</td>
        <td>${a.promotionRecommendation ?? 'N/A'}</td>
        <td>${a.potentialFlag ? 'Yes' : 'No'}</td>
      </tr>
    `)
            .join('');
        const table = `
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Reviewer</th>
            <th>Department</th>
            <th>Type</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Score</th>
            <th>Recommendation</th>
            <th>Potential</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        return this.wrapHtml('Assessment Summary Report', table);
    }
}
exports.PdfUtil = PdfUtil;
//# sourceMappingURL=PdfUtil.js.map