"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportUtil = void 0;
const exceljs_1 = require("exceljs");
const fs = require("fs");
const path = require("path");
class ExportUtil {
    static exportToCSV(data, columns, filename) {
        if (!data.length) {
            throw new Error('No data provided for CSV export.');
        }
        const csvHeader = columns.map((col) => `"${col.title}"`).join(',') + '\n';
        const csvRows = data.map((row) => columns
            .map((col) => {
            const cell = row[col.field] ?? '';
            return `"${String(cell).replace(/"/g, '""')}"`;
        })
            .join(','));
        const csvContent = csvHeader + csvRows.join('\n');
        const dirPath = path.resolve(__dirname, '../../../exports');
        fs.mkdirSync(dirPath, { recursive: true });
        const filePath = path.join(dirPath, `${filename}.csv`);
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return filePath;
    }
    static async exportToExcel(data, columns, filename) {
        if (!data.length) {
            throw new Error('No data provided for Excel export.');
        }
        const workbook = new exceljs_1.Workbook();
        const sheet = workbook.addWorksheet('Report');
        sheet.addRow(columns.map((col) => col.title));
        data.forEach((row) => {
            sheet.addRow(columns.map((col) => row[col.field] ?? ''));
        });
        const dirPath = path.resolve(__dirname, '../../../exports');
        fs.mkdirSync(dirPath, { recursive: true });
        const filePath = path.join(dirPath, `${filename}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }
    static async exportToExcelMultipleSheets(sheets, filenameBase) {
        const workbook = new exceljs_1.Workbook();
        for (const sheet of sheets) {
            const worksheet = workbook.addWorksheet(sheet.sheetName);
            worksheet.columns = sheet.columns.map((col) => ({
                header: col.title,
                key: col.field,
                width: 20,
            }));
            sheet.rows.forEach((row) => worksheet.addRow(row));
        }
        const filePath = path.join('/tmp', `${filenameBase}_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }
}
exports.ExportUtil = ExportUtil;
//# sourceMappingURL=export.util.js.map