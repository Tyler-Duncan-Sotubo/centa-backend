"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CacheVersionCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheVersionCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const cache_service_1 = require("./cache.service");
const company_service_1 = require("../../modules/core/company/company.service");
let CacheVersionCronService = CacheVersionCronService_1 = class CacheVersionCronService {
    constructor(cacheService, companyService) {
        this.cacheService = cacheService;
        this.companyService = companyService;
        this.logger = new common_1.Logger(CacheVersionCronService_1.name);
    }
    async resetCompanyCacheVersions() {
        const companies = await this.companyService.getAllCompanies();
        if (!companies?.length) {
            this.logger.log('No companies found; skipping cache version reset.');
            return;
        }
        for (const company of companies) {
            try {
                await this.cacheService.resetCompanyVersion(company.id);
                this.logger.log(`Reset cache version for company ${company.id} to 1`);
            }
            catch (err) {
                this.logger.error(`Failed to reset cache version for company ${company.id}: ${err.message}`, err.stack);
            }
        }
    }
};
exports.CacheVersionCronService = CacheVersionCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheVersionCronService.prototype, "resetCompanyCacheVersions", null);
exports.CacheVersionCronService = CacheVersionCronService = CacheVersionCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_service_1.CacheService,
        company_service_1.CompanyService])
], CacheVersionCronService);
//# sourceMappingURL=cache-version-cron.service.js.map