export declare enum PayFrequency {
    WEEKLY = "weekly",
    BIWEEKLY = "biweekly",
    MONTHLY = "monthly"
}
export declare class CreateCompanyDto {
    name: string;
    country: string;
    address?: string;
    city?: string;
    postal_code?: string;
    industry?: string;
    registration_number?: string;
    logo_url: string;
    pay_frequency?: PayFrequency;
    time_zone?: string;
    phone_number?: string;
    email?: string;
}
