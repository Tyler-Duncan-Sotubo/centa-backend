export declare enum BenefitCategory {
    Health = "Health",
    Dental = "Dental",
    Wellness = "Wellness",
    Perks = "Perks",
    LifeInsurance = "Life Insurance",
    DisabilityInsurance = "Disability Insurance",
    RetirementPlans = "Retirement Plans",
    CommuterBenefits = "Commuter Benefits",
    Reimbursement = "Reimbursement"
}
export declare enum BenefitSplit {
    EMPLOYEE = "employee",
    EMPLOYER = "employer",
    SHARED = "shared"
}
export declare class CreateBenefitPlanDto {
    benefitGroupId: string;
    name: string;
    description?: string;
    category: BenefitCategory;
    coverageOptions: string[];
    cost: Record<string, string>;
    startDate: Date;
    endDate?: Date;
    split: BenefitSplit;
    employerContribution?: number;
}
