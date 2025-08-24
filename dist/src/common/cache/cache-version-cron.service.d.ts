import { CacheService } from './cache.service';
import { CompanyService } from 'src/modules/core/company/company.service';
export declare class CacheVersionCronService {
    private readonly cacheService;
    private readonly companyService;
    private readonly logger;
    constructor(cacheService: CacheService, companyService: CompanyService);
    resetCompanyCacheVersions(): Promise<void>;
}
