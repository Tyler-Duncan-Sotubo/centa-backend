"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportMatrixUtil = void 0;
const exceljs_1 = require("exceljs");
const fs = require("fs");
const path = require("path");
class ExportMatrixUtil {
    static exportMatrixToCSV(rows, columns, filename) {
        if (!rows.length)
            throw new Error('No data provided for CSV export.');
        const header = columns.map((c) => `"${c.title}"`).join(',') + '\n';
        const csvBody = rows
            .map((row) => columns
            .map((col) => {
            const val = row[col.field] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
        })
            .join(','))
            .join('\n');
        const csvContent = header + csvBody;
        const dirPath = path.resolve(__dirname, '../../../exports');
        fs.mkdirSync(dirPath, { recursive: true });
        const filePath = path.join(dirPath, `${filename}.csv`);
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return filePath;
    }
    static async exportMatrixToExcel(rows, columns, filename) {
        if (!rows.length)
            throw new Error('No data provided for Excel export.');
        const workbook = new exceljs_1.Workbook();
        const sheet = workbook.addWorksheet('Matrix Report');
        sheet.addRow(columns.map((col) => col.title));
        rows.forEach((row) => {
            const rowData = columns.map((col) => row[col.field] ?? '');
            sheet.addRow(rowData);
        });
        const dirPath = path.resolve(__dirname, '../../../exports');
        fs.mkdirSync(dirPath, { recursive: true });
        const filePath = path.join(dirPath, `${filename}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }
}
exports.ExportMatrixUtil = ExportMatrixUtil;
//# sourceMappingURL=export-matrix-to-csv.js.map