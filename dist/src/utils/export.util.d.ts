interface ColumnDef {
    field: string;
    title: string;
}
type ExportOptions = {
    textFields?: string[];
    keepEmpty?: boolean;
};
export declare class ExportUtil {
    private static toExcelCsvText;
    private static csvEscape;
    static exportToCSV(data: any[], columns: ColumnDef[], filename: string, options?: ExportOptions): string;
    static exportToExcel(data: any[], columns: ColumnDef[], filename: string, options?: ExportOptions): Promise<string>;
    static exportToExcelMultipleSheets(sheets: {
        sheetName: string;
        rows: any[];
        columns: {
            field: string;
            title: string;
        }[];
        options?: ExportOptions;
    }[], filenameBase: string): Promise<string>;
}
export {};
