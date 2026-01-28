import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { User } from 'src/common/types/user.type';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
type Row = Record<string, any>;
type FailedRow = {
    rowIndex: number;
    employeeNumber?: string;
    email?: string;
    error: string;
};
export declare class EmployeesBulkImportWriteService {
    private readonly db;
    private readonly permissionService;
    private readonly companySettingsService;
    private readonly cacheService;
    private readonly emailQueue;
    private readonly config;
    private readonly logger;
    constructor(db: db, permissionService: PermissionsService, companySettingsService: CompanySettingsService, cacheService: CacheService, emailQueue: Queue, config: ConfigService);
    private generateToken;
    bulkCreate(user: User, rows: Row[]): Promise<{
        successCount: number;
        failedCount: number;
        failedRows: FailedRow[];
        warnings: {
            rowIndex: number;
            field: string;
            message: string;
        }[];
        created: {
            createdEmps: {
                id: string;
                email: string;
            }[];
            createdUsers: {
                id: string;
                email: string;
            }[];
            inviteTokens: {
                user_id: string;
                token: string;
                expires_at: Date;
                is_used: boolean;
            }[];
        };
        inviteTokens: {
            user_id: string;
            token: string;
            expires_at: Date;
            is_used: boolean;
        }[];
        durationMs: number;
    }>;
    private norm;
    private asString;
    private makeLookup;
    private throwIfCsvInternalDuplicates;
    private mapCompanyRole;
    private parseExcelOrDate;
    private validate3;
    private formatValidationErrors;
    private assertNoCircularManagerChains;
    private resolveManagingDirectorEmployeeIdFromDb;
    private resolveManagingDirectorEmployeeIdFromImport;
    private mapEmploymentStatus;
}
export {};
