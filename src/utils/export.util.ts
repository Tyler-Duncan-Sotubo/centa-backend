import { Workbook } from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

interface ColumnDef {
  field: string;
  title: string;
}

type ExportOptions = {
  /**
   * Fields that must be preserved as TEXT (e.g., bank account numbers with leading zeros).
   */
  textFields?: string[];

  /**
   * If true, empty values remain empty. (default true)
   */
  keepEmpty?: boolean;
};

export class ExportUtil {
  /**
   * Convert a value to something Excel will treat as TEXT in CSV.
   * Using formula form keeps leading zeros reliably: ="0270..."
   */
  private static toExcelCsvText(value: unknown): string {
    const s = String(value ?? '').trim();
    if (!s) return '';
    // Escape double quotes inside the value
    const escaped = s.replace(/"/g, '""');
    // Excel formula that returns text. When wrapped in CSV quotes it's safe.
    return `="${escaped}"`;
  }

  private static csvEscape(value: unknown): string {
    const s = String(value ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  }

  /**
   * Export array of data objects to CSV with readable headers
   */
  static exportToCSV(
    data: any[],
    columns: ColumnDef[],
    filename: string,
    options: ExportOptions = {},
  ): string {
    if (!data.length) {
      throw new Error('No data provided for CSV export.');
    }

    const textFields = new Set(options.textFields ?? []);
    const keepEmpty = options.keepEmpty ?? true;

    const csvHeader =
      columns.map((col) => this.csvEscape(col.title)).join(',') + '\n';

    const csvRows = data.map((row) =>
      columns
        .map((col) => {
          const raw = row?.[col.field];

          if (raw === null || raw === undefined || raw === '') {
            return this.csvEscape(keepEmpty ? '' : '');
          }

          // ✅ Force specific fields to stay as text (preserve leading zeros)
          if (textFields.has(col.field)) {
            return this.csvEscape(this.toExcelCsvText(raw));
          }

          // Normal fields
          return this.csvEscape(raw);
        })
        .join(','),
    );

    const csvContent = csvHeader + csvRows.join('\n');

    const dirPath = path.resolve(__dirname, '../../../exports');
    fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${filename}.csv`);

    const BOM = '\uFEFF'; // ✅ keep for Excel UTF-8 handling
    fs.writeFileSync(filePath, BOM + csvContent, 'utf8');

    return filePath;
  }

  /**
   * Export array of data objects to Excel (.xlsx) with readable headers
   */
  static async exportToExcel(
    data: any[],
    columns: ColumnDef[],
    filename: string,
    options: ExportOptions = {},
  ): Promise<string> {
    if (!data.length) {
      throw new Error('No data provided for Excel export.');
    }

    const textFields = new Set(options.textFields ?? []);

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Report');

    // Header
    sheet.addRow(columns.map((col) => col.title));

    // If you want consistent width
    sheet.columns = columns.map((c) => ({
      key: c.field,
      width: 20,
    }));

    // Rows
    data.forEach((row) => {
      const values = columns.map((col) => {
        const v = row?.[col.field];

        // ✅ Force certain fields as string in XLSX (preserve leading zeros)
        if (textFields.has(col.field)) {
          if (v === null || v === undefined) return '';
          return String(v);
        }

        return v ?? '';
      });

      const excelRow = sheet.addRow(values);

      // ✅ Apply text number format for textFields columns
      columns.forEach((col, idx) => {
        if (textFields.has(col.field)) {
          const cell = excelRow.getCell(idx + 1);
          cell.numFmt = '@'; // text format
          // ensure value is stored as string
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

  static async exportToExcelMultipleSheets(
    sheets: {
      sheetName: string;
      rows: any[];
      columns: { field: string; title: string }[];
      options?: ExportOptions;
    }[],
    filenameBase: string,
  ): Promise<string> {
    const workbook = new Workbook();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.sheetName);
      const textFields = new Set(sheet.options?.textFields ?? []);

      worksheet.columns = sheet.columns.map((col) => ({
        header: col.title,
        key: col.field,
        width: 20,
      }));

      // Add rows and enforce text format for specified fields
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
