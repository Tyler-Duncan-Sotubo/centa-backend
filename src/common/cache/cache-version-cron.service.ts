import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { CompanyService } from 'src/modules/core/company/company.service';

@Injectable()
export class CacheVersionCronService {
  private readonly logger = new Logger(CacheVersionCronService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Reset all company cache versions back to 1 at midnight on the 1st day of each quarter.
   * You can adjust CronExpression to monthly, weekly, etc.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
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
      } catch (err) {
        this.logger.error(
          `Failed to reset cache version for company ${company.id}: ${
            (err as Error).message
          }`,
          (err as Error).stack,
        );
      }
    }
  }
}
