export declare class CreateBulkExpenseDto {
    date: string;
    category: string;
    purpose: string;
    amount: string;
    status: 'Requested' | 'Pending' | 'Paid';
    receiptUrl: string;
    paymentMethod: string;
}
