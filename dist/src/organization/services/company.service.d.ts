import { db } from 'src/drizzle/types/drizzle';
import { CreateCompanyContactDto, CreateCompanyDto, UpdateCompanyContactDto, UpdateCompanyDto } from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
import { CreatePayFrequencyDto } from '../dto/create-pay-frequency.dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateCompanyTaxDto } from '../dto/create-company-tax.dto';
import { OnboardingService } from './onboarding.service';
export declare class CompanyService {
    private db;
    private readonly cache;
    private readonly awsService;
    private readonly onboardingService;
    constructor(db: db, cache: CacheService, awsService: AwsService, onboardingService: OnboardingService);
    getCompanyByUserId(company_id: string): Promise<{
        id: string;
        name: string;
        country: string;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        industry: string | null;
        registration_number: string | null;
        phone_number: string | null;
        email: string | null;
        logo_url: string | null;
        pay_frequency: string;
        pay_schedule: unknown;
        time_zone: string;
        created_at: Date;
        updated_at: Date;
    }>;
    createCompany(dto: CreateCompanyDto, company_id: string): Promise<{
        id: string;
        name: string;
        country: string;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        industry: string | null;
        registration_number: string | null;
        phone_number: string | null;
        email: string | null;
        logo_url: string | null;
        pay_frequency: string;
        pay_schedule: unknown;
        time_zone: string;
        created_at: Date;
        updated_at: Date;
    }[]>;
    updateCompany(dto: UpdateCompanyDto, company_id: string): Promise<string>;
    deleteCompany(company_id: string): Promise<{
        message: string;
    }>;
    addContactToCompany(dto: CreateCompanyContactDto, company_id: string): Promise<{
        id: string;
        name: string;
        company_id: string;
        email: string;
        phone: string | null;
        position: string | null;
    }[]>;
    getContactInCompany(company_id: string): Promise<{
        id: string;
        name: string;
        position: string | null;
        email: string;
        phone: string | null;
        company_id: string;
    }[]>;
    updateContactInCompany(dto: UpdateCompanyContactDto, company_id: string): Promise<string>;
    createCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto): Promise<{
        id: string;
        company_id: string;
        created_at: Date;
        updated_at: Date | null;
        tin: string;
        vat_number: string | null;
        nhf_code: string | null;
        pension_code: string | null;
    }[]>;
    getCompanyTaxDetails(user_id: string): Promise<{
        id: string;
        company_id: string;
        tin: string;
        vat_number: string | null;
        nhf_code: string | null;
        pension_code: string | null;
        created_at: Date;
        updated_at: Date | null;
    }>;
    updateCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto): Promise<string>;
    getPayFrequency(company_id: string): Promise<{
        id: string;
        companyId: string;
        startDate: string;
        paySchedule: unknown;
        payFrequency: string;
        weekendAdjustment: string;
        holidayAdjustment: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    getNextPayDate(company_id: string): Promise<Date | null>;
    getPayFrequencySummary(company_id: string): Promise<{
        payFrequency: string;
        paySchedules: unknown;
        id: string;
    }[]>;
    private isPublicHoliday;
    private adjustForWeekendAndHoliday;
    private generatePaySchedule;
    createPayFrequency(company_id: string, dto: CreatePayFrequencyDto): Promise<QueryResult<import("drizzle-orm").Assume<this["row"], QueryResultRow>>>;
    updatePayFrequency(company_id: string, dto: CreatePayFrequencyDto, payFrequencyId: string): Promise<string>;
}
