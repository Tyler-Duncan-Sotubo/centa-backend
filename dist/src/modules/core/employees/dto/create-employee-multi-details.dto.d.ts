export declare class CreateEmployeeMultiDetailsDto {
    firstName: string;
    lastName: string;
    email: string;
    companyRoleId: string;
    role: string;
    employeeNumber: string;
    departmentId: string;
    locationId: string;
    payGroupId: string;
    jobRoleId: string;
    costCenterId: string;
    employmentStatus: string;
    employmentStartDate: string;
    probationEndDate?: string;
    confirmed: boolean;
    dateOfBirth: string;
    phone: string;
    gender: string;
    maritalStatus: string;
    address: string;
    state: string;
    country: string;
    emergencyName: string;
    emergencyPhone: string;
    grossSalary: number;
    currency: string;
    payFrequency: 'Monthly' | 'Biweekly' | 'Weekly';
    applyNHf: boolean;
    name: string;
    relationship: string;
    dependentDob: string;
    isBeneficiary: boolean;
    effectiveDate: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranch?: string;
    bankAccountName?: string;
    tin?: string;
    pensionPin?: string;
    nhfNumber?: string;
}
