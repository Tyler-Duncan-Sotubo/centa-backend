export declare enum RateType {
    FIXED = "fixed",
    PERCENTAGE = "percentage"
}
export declare class CreateEmployeeDeductionDto {
    employeeId: string;
    deductionTypeId: string;
    rateType: RateType;
    rateValue: string;
    startDate: string;
    endDate?: string;
    metadata?: Record<string, any>;
    isActive?: boolean;
}
