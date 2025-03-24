export declare class CreatePayFrequencyDto {
    pay_frequency: string;
    startDate: string;
    weekendAdjustment: 'friday' | 'monday' | 'none';
    holidayAdjustment: 'previous' | 'next' | 'none';
    countryCode: string;
}
