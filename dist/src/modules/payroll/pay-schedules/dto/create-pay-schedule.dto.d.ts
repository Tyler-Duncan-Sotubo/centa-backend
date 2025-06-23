export declare class CreatePayScheduleDto {
    payFrequency: string;
    startDate: string;
    weekendAdjustment: 'friday' | 'monday' | 'none';
    holidayAdjustment: 'previous' | 'next' | 'none';
    countryCode: string;
}
