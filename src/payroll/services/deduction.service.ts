import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq } from 'drizzle-orm';
import {
  customDeductions,
  taxConfig,
} from 'src/drizzle/schema/deductions.schema';
import { CreateCustomDeduction, UpdateCustomDeductionDto } from '../dto';
import { companies } from 'src/drizzle/schema/company.schema';
import { employees } from 'src/drizzle/schema/employee.schema';
import { CacheService } from 'src/config/cache/cache.service';
import { updateTaxConfigurationDto } from '../dto/update-tax-config.dto';
import { OnboardingService } from 'src/organization/services/onboarding.service';
@Injectable()
export class DeductionService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private cache: CacheService,
    private readonly onboardingService: OnboardingService,
  ) {}

  private getCompany = async (company_id: string) => {
    const cacheKey = `company_id:${company_id}`;
    return this.cache.getOrSetCache(cacheKey, async () => {
      const company = await this.db
        .select()
        .from(companies)
        .where(eq(companies.id, company_id))
        .execute();

      if (!company) throw new BadRequestException('Company not found');

      return company[0].id;
    });
  };

  // Tax Configuration
  async updateTaxConfiguration(
    company_id: string,
    dto: updateTaxConfigurationDto,
  ) {
    const companyId = await this.getCompany(company_id);
    await this.onboardingService.completeTask(
      companyId,
      'updatePayrollSettings',
    );

    return await this.db
      .update(taxConfig)
      .set({
        apply_nhf: dto.apply_nhf,
        apply_paye: dto.apply_paye,
        apply_pension: dto.apply_pension,
        company_id: companyId,
      })
      .where(eq(taxConfig.company_id, companyId))
      .execute();
  }

  // Fetch Tax Configuration
  async getTaxConfiguration(company_id: string) {
    const companyId = await this.getCompany(company_id);
    const taxConfigData = await this.db
      .select({
        apply_nhf: taxConfig.apply_nhf,
        apply_paye: taxConfig.apply_paye,
        apply_pension: taxConfig.apply_pension,
      })
      .from(taxConfig)
      .where(eq(taxConfig.company_id, companyId))
      .execute();

    if (!taxConfigData) throw new BadRequestException('Tax Config not found');

    return taxConfigData[0];
  }

  // Create Custom Deduction
  async createCustomDeduction(user_id: string, dto: CreateCustomDeduction) {
    const company_id = await this.getCompany(user_id);
    return await this.db
      .insert(customDeductions)
      .values({
        company_id: company_id,
        deduction_name: dto.deduction_name,
        amount: dto.amount * 100,
        employee_id: dto.employee_id,
      })
      .execute();
  }
  // Fetch Custom Deduction
  async fetchCustomDeduction(user_id: string) {
    const company_id = await this.getCompany(user_id);
    const result = await this.db
      .select({
        id: customDeductions.id,
        deduction_name: customDeductions.deduction_name,
        amount: customDeductions.amount,
        first_name: employees.first_name,
        last_name: employees.last_name,
        employee_id: customDeductions.employee_id,
      })
      .from(customDeductions)
      .leftJoin(employees, eq(customDeductions.employee_id, employees.id))
      .where(eq(customDeductions.company_id, company_id))
      .execute();

    return result;
  }

  // Update Custom Deduction
  async updateCustomDeduction(
    user_id: string,
    dto: UpdateCustomDeductionDto,
    id: string,
  ) {
    const company_id = await this.getCompany(user_id);
    return await this.db
      .update(customDeductions)
      .set({
        company_id: company_id,
        deduction_name: dto.deduction_name,
        amount: dto.amount,
      })
      .where(eq(customDeductions.id, id))
      .execute();
  }

  // Delete Custom Deduction
  async deleteCustomDeduction(id: string) {
    return await this.db
      .delete(customDeductions)
      .where(eq(customDeductions.id, id))
      .execute();
  }
}
