export declare class CreateScorecardCriterionDto {
    label: string;
    description?: string;
    maxScore: number;
}
export declare class CreateScorecardTemplateDto {
    name: string;
    description?: string;
    criteria: CreateScorecardCriterionDto[];
}
