import { Workbook } from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

interface ColumnDef {
  field: string;
  title: string;
}

export class ExportUtil {
  /**
   * Export array of data objects to CSV with readable headers
   */
  static exportToCSV(
    data: any[],
    columns: ColumnDef[],
    filename: string,
  ): string {
    if (!data.length) {
      throw new Error('No data provided for CSV export.');
    }

    const csvHeader = columns.map((col) => `"${col.title}"`).join(',') + '\n';
    const csvRows = data.map((row) =>
      columns
        .map((col) => {
          const cell = row[col.field] ?? '';
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(','),
    );
    const csvContent = csvHeader + csvRows.join('\n');

    const dirPath = path.resolve(__dirname, '../../../exports');
    fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${filename}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf8');

    return filePath;
  }

  /**
   * Export array of data objects to Excel (.xlsx) with readable headers
   */
  static async exportToExcel(
    data: any[],
    columns: ColumnDef[],
    filename: string,
  ): Promise<string> {
    if (!data.length) {
      throw new Error('No data provided for Excel export.');
    }

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Report');

    // Add readable header
    sheet.addRow(columns.map((col) => col.title));

    // Add rows
    data.forEach((row) => {
      sheet.addRow(columns.map((col) => row[col.field] ?? ''));
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
    }[],
    filenameBase: string,
  ): Promise<string> {
    const workbook = new Workbook();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.sheetName);

      // Set columns
      worksheet.columns = sheet.columns.map((col) => ({
        header: col.title,
        key: col.field,
        width: 20,
      }));

      // Add rows
      sheet.rows.forEach((row) => worksheet.addRow(row));
    }

    const filePath = path.join('/tmp', `${filenameBase}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}
