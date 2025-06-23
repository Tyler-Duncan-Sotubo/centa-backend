export declare enum Gender {
    Male = "male",
    Female = "female",
    Other = "other"
}
export declare enum MaritalStatus {
    Single = "single",
    Married = "married",
    Divorced = "divorced",
    Widowed = "widowed"
}
export declare enum Currency {
    NGN = "NGN"
}
export declare class EmployeeOnboardingInputDto {
    employeeId: string;
    dateOfBirth?: string;
    gender?: Gender;
    maritalStatus?: MaritalStatus;
    address?: string;
    country?: string;
    phone?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranch?: string;
    bankAccountName?: string;
    currency?: string;
    tin?: string;
    pensionPin?: string;
    nhfNumber?: string;
    idUpload?: string;
}
