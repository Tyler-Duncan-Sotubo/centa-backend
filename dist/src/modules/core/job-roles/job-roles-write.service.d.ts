import { db } from 'src/drizzle/types/drizzle';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
type Row = Record<string, any>;
export declare class JobRolesWriteService {
    private readonly db;
    private readonly companySettings;
    private readonly cache;
    constructor(db: db, companySettings: CompanySettingsService, cache: CacheService);
    create(companyId: string, dto: CreateJobRoleDto): Promise<{
        id: string;
    }>;
    bulkCreate(companyId: string, rows: Row[]): Promise<{
        id: string;
        title: string;
    }[]>;
    update(companyId: string, id: string, dto: UpdateJobRoleDto): Promise<{
        id: string;
    }>;
    remove(companyId: string, id: string): Promise<{
        id: string;
    }>;
    private ensureRows;
    private parseRows;
    private throwIfMissingTitles;
    private throwIfCsvDuplicates;
    private validateRows;
    private throwIfExistingInDb;
    private pick;
    private asString;
    private normalizeKey;
    private formatValidationErrors;
}
export {};
