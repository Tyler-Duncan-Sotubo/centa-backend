import { ValidatorConstraintInterface } from 'class-validator';
export declare class CheckinValueOrPct implements ValidatorConstraintInterface {
    validate(obj: any): boolean;
    defaultMessage(): string;
}
export declare class AddKrCheckinDto {
    dummyProperty?: any;
    value?: number | null;
    progressPct?: number | null;
    note?: string | null;
    allowRegression?: boolean;
}
