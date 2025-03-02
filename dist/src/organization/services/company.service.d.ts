import { db } from 'src/drizzle/types/drizzle';
import { CreateCompanyContactDto, CreateCompanyDto, UpdateCompanyContactDto, UpdateCompanyDto } from '../dto';
import { CacheService } from 'src/config/cache/cache.service';
import { CreatePayFrequencyDto } from '../dto/create-pay-frequency.dto';
import { AwsService } from 'src/config/aws/aws.service';
import { CreateCompanyTaxDto } from '../dto/create-company-tax.dto';
export declare class CompanyService {
    private db;
    private readonly cache;
    private readonly awsService;
    constructor(db: db, cache: CacheService, awsService: AwsService);
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
        email: string;
        position: string | null;
        phone: string | null;
        company_id: string;
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
    private generatePaySchedule;
    getPayFrequency(company_id: string): Promise<{
        id: string;
        pay_frequency: string;
    }[]>;
    updatePayFrequency(company_id: string, dto: CreatePayFrequencyDto): Promise<string>;
    createCompanyTaxDetails(user_id: string, dto: CreateCompanyTaxDto): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date | null;
        company_id: string;
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
}
