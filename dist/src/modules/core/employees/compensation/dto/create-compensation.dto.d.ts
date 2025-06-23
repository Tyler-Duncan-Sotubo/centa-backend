export declare class CreateCompensationDto {
    effectiveDate: string;
    grossSalary: number;
    currency?: string;
    payFrequency: 'Monthly' | 'Biweekly' | 'Weekly';
}
