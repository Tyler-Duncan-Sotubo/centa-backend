import { createReadStream } from 'fs';
import { extname } from 'path';
import * as csvParser from 'csv-parser';
import * as XLSX from 'xlsx';

/**
 * Parses a CSV or XLSX file into a JSON array.
 * Throws on unsupported extensions or if maxRows exceeded.
 */
export async function parseFile(
  filePath: string,
  originalName: string,
  maxRows: number,
): Promise<any[]> {
  const ext = extname(originalName).toLowerCase();
  let rows: any[] = [];
  if (ext === '.csv') {
    await new Promise<void>((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    throw new Error('Unsupported file type');
  }
  if (rows.length > maxRows) {
    throw new Error(`Maximum ${maxRows} rows exceeded`);
  }
  return rows;
}
