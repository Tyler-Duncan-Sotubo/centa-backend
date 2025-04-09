import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  companies,
  company_contact,
  company_tax_details,
  paySchedules,
} from '../../drizzle/schema/company.schema';
import { and, eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  CreateCompanyContactDto,
  CreateCompanyDto,
  UpdateCompanyContactDto,
  UpdateCompanyDto,
} from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
import {
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  isSaturday,
  isSunday,
} from 'date-fns';
import { CreatePayFrequencyDto } from '../dto/create-pay-frequency.dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateCompanyTaxDto } from '../dto/create-company-tax.dto';
import { OnboardingService } from './onboarding.service';
import axios from 'axios';
import { employees } from 'src/drizzle/schema/employee.schema';
import { bonus } from 'src/drizzle/schema/payroll.schema';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly awsService: AwsService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async getCompanyByUserId(company_id: string) {
    const result = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (result.length === 0) {
      throw new NotFoundException('Company not found');
    }

    return result[0]; // Return the first matching user
  }

  async createCompany(dto: CreateCompanyDto, company_id: string) {
    const companyExists = await this.db
      .select({
        id: companies.id,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (companyExists.length > 0) {
      throw new BadRequestException('Company already exists');
    }

    const company = await this.db
      .insert(companies)
      .values({
        ...dto,
      })
      .returning()
      .execute();

    return company;
  }

  async updateCompany(dto: UpdateCompanyDto, company_id: string) {
    const company = await this.getCompanyByUserId(company_id);
    const logoUrl = dto.logo_url
      ? await this.awsService.uploadImageToS3(
          company.email!,
          'logo',
          dto.logo_url,
        )
      : undefined;

    try {
      await this.db
        .update(companies)
        .set({
          ...dto,
          logo_url: logoUrl,
        })
        .where(eq(companies.id, company_id))
        .returning()
        .execute();

      await this.onboardingService.completeTask(
        company_id,
        'setupCompanyProfile',
      );

      // Clear cache
      await this.cache.del(`companies:${company_id}`);

      return 'Company updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteCompany(company_id: string) {
    try {
      await this.db
        .delete(companies)
        .where(eq(companies.id, company_id))
        .execute();

      // Clear cache
      await this.cache.del(`companies:${company_id}`);

      return { message: 'Company deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // add contact to company
  async addContactToCompany(dto: CreateCompanyContactDto, company_id: string) {
    const contact = await this.db
      .insert(company_contact)
      .values({
        ...dto,
        company_id,
      })
      .returning()
      .execute();

    // Clear cache
    await this.cache.del(`companies-contact:${company_id}`);

    return contact;
  }

  // get contact in company
  async getContactInCompany(company_id: string) {
    const cacheKey = `companies-contact:${company_id}`;

    return this.cache.getOrSetCache(cacheKey, async () => {
      const contact = await this.db
        .select()
        .from(company_contact)
        .where(eq(company_contact.company_id, company_id))
        .execute();

      return contact;
    });
  }

  // update contact in company
  async updateContactInCompany(
    dto: UpdateCompanyContactDto,
    company_id: string,
  ) {
    try {
      await this.db
        .update(company_contact)
        .set({
          ...dto,
        })
        .where(eq(company_contact.company_id, company_id))
        .returning()
        .execute();

      // Clear cache
      await this.cache.del(`companies-contact:${company_id}`);

      return 'Contact updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Company Tax Details

  async createCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto) {
    const company = await this.getCompanyByUserId(user_id);
    const taxDetails = await this.db
      .insert(company_tax_details)
      .values({
        ...dto,
        company_id: company.id,
      })
      .returning()
      .execute();

    await this.onboardingService.completeTask(company.id, 'addTaxInformation');

    return taxDetails;
  }

  async getCompanyTaxDetails(user_id: string) {
    const company = await this.getCompanyByUserId(user_id);
    const taxDetails = await this.db
      .select()
      .from(company_tax_details)
      .where(eq(company_tax_details.company_id, company.id))
      .execute();

    return taxDetails[0] || {};
  }

  async updateCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto) {
    const company = await this.getCompanyByUserId(user_id);

    try {
      await this.db
        .update(company_tax_details)
        .set({
          tin: dto.tin,
          vat_number: dto.vat_number,
          nhf_code: dto.nhf_code,
          pension_code: dto.pension_code,
        })
        .where(eq(company_tax_details.company_id, company.id))
        .returning()
        .execute();

      // Clear cache
      // await this.cache.del(`companies-tax-details:${user_id}`);

      return 'Company tax details updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Pay Frequency --------------------------------------
  async getPayFrequency(company_id: string) {
    const payFrequency = await this.db
      .select()
      .from(paySchedules)
      .where(eq(paySchedules.companyId, company_id))
      .execute();

    return payFrequency;
  }

  async getNextPayDate(company_id: string) {
    const paySchedulesData = await this.db
      .select({
        paySchedule: paySchedules.paySchedule,
      })
      .from(paySchedules)
      .where(eq(paySchedules.companyId, company_id))
      .execute();

    const today = new Date();

    const allPayDates = paySchedulesData
      .flatMap((schedule) => schedule.paySchedule)
      .map((date) => new Date(date as string | number | Date))
      .filter((date) => date > today)
      .sort((a, b) => a.getTime() - b.getTime());

    return allPayDates.length > 0 ? allPayDates[0] : null;
  }

  async getPayFrequencySummary(company_id: string) {
    const payFrequency = await this.db
      .select({
        payFrequency: paySchedules.payFrequency,
        paySchedules: paySchedules.paySchedule,
        id: paySchedules.id,
      })
      .from(paySchedules)
      .where(eq(paySchedules.companyId, company_id))
      .execute();

    return payFrequency;
  }

  private async isPublicHoliday(
    date: Date,
    countryCode: string,
  ): Promise<boolean> {
    const formattedDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD

    const url = `https://date.nager.at/api/v3/publicholidays/${date.getFullYear()}/${countryCode}`;
    try {
      const response = await axios.get(url);
      const holidays = response.data;
      return holidays.some((holiday: any) => holiday.date === formattedDate);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Adjust pay date if it falls on a weekend or public holiday
   */
  /**
   * Adjust pay date if it falls on a weekend or public holiday
   */
  private async adjustForWeekendAndHoliday(
    date: Date,
    countryCode: string,
  ): Promise<Date> {
    let adjustedDate = date;

    // Handle weekends (Strict -1/-2 rule)
    if (isSaturday(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, -1); // Move to Friday
    } else if (isSunday(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, -2); // Move to Friday
    }

    // Handle public holidays
    while (await this.isPublicHoliday(adjustedDate, countryCode)) {
      adjustedDate = addDays(adjustedDate, -1); // Keep moving back 1 day
    }

    return adjustedDate;
  }

  /**
   * Generate Pay Schedule based on pay frequency, ensuring it avoids weekends & holidays
   */
  private async generatePaySchedule(
    startDate: Date,
    frequency: string,
    numPeriods = 6,
    countryCode: string,
  ): Promise<Date[]> {
    const schedule: Date[] = [];

    for (let i = 0; i < numPeriods; i++) {
      let payDate: Date;

      switch (frequency) {
        case 'weekly':
          payDate = addDays(startDate, i * 7);
          break;

        case 'biweekly':
          payDate = addDays(startDate, i * 14);
          break;

        case 'semi-monthly':
          const firstHalf = startOfMonth(addMonths(startDate, i));
          const secondHalf = addDays(firstHalf, 14);

          schedule.push(
            await this.adjustForWeekendAndHoliday(firstHalf, countryCode),
            await this.adjustForWeekendAndHoliday(secondHalf, countryCode),
          );
          continue;

        case 'monthly':
          payDate = endOfMonth(addMonths(startDate, i));
          break;

        default:
          throw new Error('Invalid frequency');
      }

      schedule.push(
        await this.adjustForWeekendAndHoliday(payDate, countryCode),
      );
    }

    return schedule;
  }

  async createPayFrequency(company_id: string, dto: CreatePayFrequencyDto) {
    const schedule = await this.generatePaySchedule(
      new Date(dto.startDate),
      dto.pay_frequency,
      6,
      dto.countryCode,
    );

    try {
      // **Create a new schedule if none exists**
      const paySchedule = await this.db.insert(paySchedules).values({
        companyId: company_id,
        payFrequency: dto.pay_frequency,
        paySchedule: schedule,
        startDate: dto.startDate,
        weekendAdjustment: dto.weekendAdjustment,
        holidayAdjustment: dto.holidayAdjustment,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Clear cache
      await this.cache.del(`companies:${company_id}`);

      await this.onboardingService.completeTask(
        company_id,
        'configurePayrollSchedule',
      );

      return paySchedule;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update a company's pay frequency and generate a new pay schedule
   */
  async updatePayFrequency(
    company_id: string,
    dto: CreatePayFrequencyDto,
    payFrequencyId: string,
  ) {
    const schedule = await this.generatePaySchedule(
      new Date(dto.startDate),
      dto.pay_frequency,
      6,
      dto.countryCode,
    );

    try {
      await this.db
        .update(paySchedules)
        .set({
          payFrequency: dto.pay_frequency,
          paySchedule: schedule,
          startDate: dto.startDate,
          weekendAdjustment: dto.weekendAdjustment,
          holidayAdjustment: dto.holidayAdjustment,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paySchedules.companyId, company_id),
            eq(paySchedules.id, payFrequencyId),
          ),
        )
        .execute();

      // Clear cache
      await this.cache.del(`companies:${company_id}`);

      await this.onboardingService.completeTask(
        company_id,
        'configurePayrollSchedule',
      );

      return 'Pay frequency updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getDashboardPreview(company_id: string) {
    const company = await this.db
      .select({
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.id, company_id));

    const nextPayDate = await this.getNextPayDate(company_id);

    const allEmployees = await this.db
      .select({
        employment_status: employees.employment_status,
        annual_gross: employees.annual_gross,
      })
      .from(employees)
      .where(eq(employees.company_id, company_id));

    const bonuses = await this.db
      .select({
        id: bonus.id,
        amount: bonus.amount,
      })
      .from(bonus)
      .where(eq(bonus.company_id, company_id))
      .execute();

    const totalBonus = bonuses.reduce((acc, bonus) => acc + bonus.amount, 0);

    return {
      company: company[0] || {},
      nextPayDate: nextPayDate || '',
      employees: allEmployees || [],
      bonus: totalBonus || [],
    };
  }
}
