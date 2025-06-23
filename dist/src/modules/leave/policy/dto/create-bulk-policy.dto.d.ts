export declare class BulkCreateLeavePolicyDto {
    leaveTypeId: string;
    accrualEnabled?: boolean;
    accrualFrequency?: 'monthly' | 'quarterly' | 'annually';
    accrualAmount?: string;
    maxBalance?: number;
    allowCarryover?: boolean;
    carryoverLimit?: number;
    onlyConfirmedEmployees?: boolean;
    eligibilityRules?: Record<string, any>;
    genderEligibility?: 'male' | 'female' | 'any';
    leaveNature?: 'paid' | 'unpaid' | 'mandatory' | 'optional' | 'statutory';
    isSplittable?: boolean;
}
