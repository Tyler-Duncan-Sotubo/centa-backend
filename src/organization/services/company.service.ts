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
} from '../../drizzle/schema/company.schema';
import { eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  CreateCompanyContactDto,
  CreateCompanyDto,
  UpdateCompanyContactDto,
  UpdateCompanyDto,
} from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
import { addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { CreatePayFrequencyDto } from '../dto/create-pay-frequency.dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateCompanyTaxDto } from '../dto/create-company-tax.dto';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
    private readonly awsService: AwsService,
  ) {}

  async getCompanyByUserId(company_id: string) {
    // const cacheKey = `companies:${user_id}`;

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

  private generatePaySchedule = (
    startDate: Date,
    frequency: string,
    numPeriods = 6,
  ) => {
    const schedule: Date[] = [];

    for (let i = 0; i < numPeriods; i++) {
      let payDate;

      switch (frequency) {
        case 'weekly':
          payDate = addDays(startDate, i * 7);
          break;

        case 'biweekly':
          payDate = addDays(startDate, i * 14);
          break;

        case 'semi-monthly':
          // 1st and 15th of each month
          const firstHalf = startOfMonth(addMonths(startDate, i));
          const secondHalf = addDays(firstHalf, 14);
          schedule.push(firstHalf, secondHalf);
          continue;

        case 'monthly':
          payDate = endOfMonth(addMonths(startDate, i));
          break;

        default:
          throw new Error('Invalid frequency');
      }

      schedule.push(payDate);
    }

    return schedule;
  };

  // Pay Frequency
  async getPayFrequency(company_id: string) {
    const payFrequency = await this.db
      .select({
        id: companies.id,
        pay_frequency: companies.pay_frequency,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    return payFrequency;
  }

  // Update Pay Frequency
  async updatePayFrequency(company_id: string, dto: CreatePayFrequencyDto) {
    const schedule = this.generatePaySchedule(
      new Date(dto.startDate),
      dto.pay_frequency,
    );
    try {
      await this.db
        .update(companies)
        .set({
          pay_frequency: dto.pay_frequency,
          pay_schedule: schedule,
        })
        .where(eq(companies.id, company_id))
        .returning()
        .execute();

      // Clear cache
      await this.cache.del(`companies:${company_id}`);

      return 'Pay frequency updated successfully';
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Company Tax Details

  async createCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto) {
    const company = await this.getCompanyByUserId(user_id);
    console.log('dto', dto);
    const taxDetails = await this.db
      .insert(company_tax_details)
      .values({
        ...dto,
        company_id: company.id,
      })
      .returning()
      .execute();

    // Clear cache
    // await this.cache.del(`companies-tax-details:${user_id}`);

    return taxDetails;
  }

  async getCompanyTaxDetails(user_id: string) {
    const company = await this.getCompanyByUserId(user_id);
    const taxDetails = await this.db
      .select()
      .from(company_tax_details)
      .where(eq(company_tax_details.company_id, company.id))
      .execute();

    return taxDetails[0];
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
}
