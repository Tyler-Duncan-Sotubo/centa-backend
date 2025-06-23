export declare class CreatePayrollAdjustmentDto {
    employeeId: string;
    payrollDate: string;
    amount: number;
    type: string;
    label?: string;
    taxable?: boolean;
    proratable?: boolean;
    recurring?: boolean;
    notes?: string;
}
