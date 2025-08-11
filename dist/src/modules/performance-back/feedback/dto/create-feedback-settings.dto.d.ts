export declare class ScopeDto {
    officeOnly?: boolean;
    departmentOnly?: boolean;
    offices?: string[];
    departments?: string[];
}
export declare class RuleDto {
    group: 'employee' | 'manager';
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';
    enabled: boolean;
    scope?: ScopeDto;
}
export declare class CreateFeedbackSettingsDto {
    enableEmployeeFeedback: boolean;
    enableManagerFeedback: boolean;
    allowAnonymous: boolean;
    rules: RuleDto[];
}
