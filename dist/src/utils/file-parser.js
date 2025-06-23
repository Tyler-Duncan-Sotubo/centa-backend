"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFile = parseFile;
const fs_1 = require("fs");
const path_1 = require("path");
const csvParser = require("csv-parser");
const XLSX = require("xlsx");
async function parseFile(filePath, originalName, maxRows) {
    const ext = (0, path_1.extname)(originalName).toLowerCase();
    let rows = [];
    if (ext === '.csv') {
        await new Promise((resolve, reject) => {
            (0, fs_1.createReadStream)(filePath)
                .pipe(csvParser())
                .on('data', (row) => rows.push(row))
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    }
    else if (ext === '.xlsx' || ext === '.xls') {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    else {
        throw new Error('Unsupported file type');
    }
    if (rows.length > maxRows) {
        throw new Error(`Maximum ${maxRows} rows exceeded`);
    }
    return rows;
}
//# sourceMappingURL=file-parser.js.map