"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportUtil = void 0;
const exceljs_1 = require("exceljs");
const fs = require("fs");
const path = require("path");
class ExportUtil {
    static toExcelCsvText(value) {
        const s = String(value ?? '').trim();
        if (!s)
            return '';
        const escaped = s.replace(/"/g, '""');
        return `="${escaped}"`;
    }
    static csvEscape(value) {
        const s = String(value ?? '');
        return `"${s.replace(/"/g, '""')}"`;
    }
    static exportToCSV(data, columns, filename, options = {}) {
        if (!data.length) {
            throw new Error('No data provided for CSV export.');
        }
        const textFields = new Set(options.textFields ?? []);
        const keepEmpty = options.keepEmpty ?? true;
        const csvHeader = columns.map((col) => this.csvEscape(col.title)).join(',') + '\n';
        const csvRows = data.map((row) => columns
            .map((col) => {
            const raw = row?.[col.field];
            if (raw === null || raw === undefined || raw === '') {
                return this.csvEscape(keepEmpty ? '' : '');
            }
            if (textFields.has(col.field)) {
                return this.csvEscape(this.toExcelCsvText(raw));
            }
            return this.csvEscape(raw);
        })
            .join(','));
        const csvContent = csvHeader + csvRows.join('\n');
        const dirPath = path.resolve(__dirname, '../../../exports');
        fs.mkdirSync(dirPath, { recursive: true });
        const filePath = path.join(dirPath, `${filename}.csv`);
        const BOM = '\uFEFF';
        fs.writeFileSync(filePath, BOM + csvContent, 'utf8');
        return filePath;
    }
    static async exportToExcel(data, columns, filename, options = {}) {
        if (!data.length) {
            throw new Error('No data provided for Excel export.');
        }
        const textFields = new Set(options.textFields ?? []);
        const workbook = new exceljs_1.Workbook();
        const sheet = workbook.addWorksheet('Report');
        sheet.addRow(columns.map((col) => col.title));
        sheet.columns = columns.map((c) => ({
            key: c.field,
            width: 20,
        }));
        data.forEach((row) => {
            const values = columns.map((col) => {
                const v = row?.[col.field];
                if (textFields.has(col.field)) {
                    if (v === null || v === undefined)
                        return '';
                    return String(v);
                }
                return v ?? '';
            });
            const excelRow = sheet.addRow(values);
            columns.forEach((col, idx) => {
                if (textFields.has(col.field)) {
                    const cell = excelRow.getCell(idx + 1);
                    cell.numFmt = '@';
                    if (cell.value !== null && cell.value !== undefined) {
                        cell.value = String(cell.value);
                    }
                }
            });
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
            const textFields = new Set(sheet.options?.textFields ?? []);
            worksheet.columns = sheet.columns.map((col) => ({
                header: col.title,
                key: col.field,
                width: 20,
            }));
            sheet.rows.forEach((rowObj) => {
                const row = worksheet.addRow(rowObj);
                sheet.columns.forEach((col, idx) => {
                    if (textFields.has(col.field)) {
                        const cell = row.getCell(idx + 1);
                        cell.numFmt = '@';
                        const v = rowObj?.[col.field];
                        cell.value = v === null || v === undefined ? '' : String(v);
                    }
                });
            });
        }
        const filePath = path.join('/tmp', `${filenameBase}_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        return filePath;
    }
}
exports.ExportUtil = ExportUtil;
//# sourceMappingURL=export.util.js.map