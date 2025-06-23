export declare class ExportMatrixUtil {
    static exportMatrixToCSV(rows: Record<string, any>[], columns: {
        field: string;
        title: string;
    }[], filename: string): string;
    static exportMatrixToExcel(rows: Record<string, any>[], columns: {
        field: string;
        title: string;
    }[], filename: string): Promise<string>;
}
