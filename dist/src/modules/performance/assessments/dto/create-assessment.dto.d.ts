export declare class CreateAssessmentDto {
    cycleId: string;
    templateId?: string;
    revieweeId: string;
    type: 'self' | 'manager' | 'peer';
}
