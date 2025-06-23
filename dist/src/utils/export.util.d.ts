interface ColumnDef {
    field: string;
    title: string;
}
export declare class ExportUtil {
    static exportToCSV(data: any[], columns: ColumnDef[], filename: string): string;
    static exportToExcel(data: any[], columns: ColumnDef[], filename: string): Promise<string>;
    static exportToExcelMultipleSheets(sheets: {
        sheetName: string;
        rows: any[];
        columns: {
            field: string;
            title: string;
        }[];
    }[], filenameBase: string): Promise<string>;
}
export {};
