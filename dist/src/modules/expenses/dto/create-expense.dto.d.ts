export declare class CreateExpenseDto {
    employeeId: string;
    date: string;
    category: string;
    purpose: string;
    amount: string;
    status: 'Requested' | 'Pending' | 'Paid';
    receiptUrl: string;
    paymentMethod: string;
    rejectionReason: string;
}
