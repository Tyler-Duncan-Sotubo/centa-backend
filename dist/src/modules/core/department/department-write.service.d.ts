import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
type Row = Record<string, any>;
export declare class DepartmentWriteService {
    private readonly db;
    private readonly cache;
    private readonly companySettings;
    constructor(db: db, cache: CacheService, companySettings: CompanySettingsService);
    bulkCreate(companyId: string, rows: Row[]): Promise<{
        id: any;
        name: any;
        description: any;
    }[]>;
    private ensureRows;
    private parseRows;
    private throwIfMissingNames;
    private throwIfCsvDuplicates;
    private validateRows;
    private throwIfExistingInDb;
    private insertDepartments;
    private postWrite;
    private pick;
    private asString;
    private normalizeName;
    private formatValidationErrors;
}
export {};
