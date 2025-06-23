export declare enum FieldTag {
    PROFILE = "profile",
    FINANCE = "finance",
    EDUCATION = "education",
    DEPENDENTS = "dependents",
    DOCUMENT = "document",
    OTHER = "other"
}
export declare class OnboardingTemplateChecklistDto {
    title: string;
    assignee: 'employee' | 'hr';
    dueDaysAfterStart?: number;
    order?: number;
}
export declare class OnboardingTemplateFieldDto {
    fieldKey: string;
    label: string;
    fieldType: string;
    required: boolean;
    order: number;
    tag: string;
}
export declare class CreateOnboardingTemplateDto {
    name: string;
    description: string;
    fields: OnboardingTemplateFieldDto[];
    checklist: OnboardingTemplateChecklistDto[];
}
