type FormatCurrencyOptions = {
    safeTextCurrency?: boolean;
    safePrefix?: 'NGN' | 'N';
};
export declare const formatCurrency: (amount: number, currency?: string, locale?: string, options?: FormatCurrencyOptions) => string;
export declare const toNaira: (value: number | null | undefined) => number;
export {};
