export declare class CreateAllowanceDto {
    payGroupId: string;
    allowanceType: string;
    valueType: 'percentage' | 'fixed';
    percentage?: string;
    fixedAmount?: number;
}
