export declare class CreateAppraisalDto {
    cycleId: string;
    employeeId: string;
    promotionRecommendation?: 'promote' | 'hold' | 'exit';
    finalScore?: number;
    finalNote?: string;
}
