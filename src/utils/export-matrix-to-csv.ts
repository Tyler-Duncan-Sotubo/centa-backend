import { Workbook } from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export class ExportMatrixUtil {
  /**
   * Export matrix-style data to CSV
   */
  static exportMatrixToCSV(
    rows: Record<string, any>[],
    columns: { field: string; title: string }[],
    filename: string,
  ): string {
    if (!rows.length) throw new Error('No data provided for CSV export.');

    const header = columns.map((c) => `"${c.title}"`).join(',') + '\n';

    const csvBody = rows
      .map((row) =>
        columns
          .map((col) => {
            const val = row[col.field] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');

    const csvContent = header + csvBody;

    const dirPath = path.resolve(__dirname, '../../../exports');
    fs.mkdirSync(dirPath, { recursive: true });

    const filePath = path.join(dirPath, `${filename}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf8');

    return filePath;
  }

  /**
   * Export matrix-style data to Excel (.xlsx)
   */
  static async exportMatrixToExcel(
    rows: Record<string, any>[],
    columns: { field: string; title: string }[],
    filename: string,
  ): Promise<string> {
    if (!rows.length) throw new Error('No data provided for Excel export.');

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Matrix Report');

    // Add header row
    sheet.addRow(columns.map((col) => col.title));

    // Add data rows
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
