export declare class ExportCleanupService {
    private readonly logger;
    private readonly EXPORTS_DIR;
    private readonly TEMP_DIR;
    private readonly MAX_FILE_AGE_MS;
    handleExportFileCleanup(): void;
    handleTempFileCleanup(): void;
}
