export declare class FeedbackRuleScopeDto {
    officeOnly?: boolean;
    departmentOnly?: boolean;
    offices?: string[];
    departments?: string[];
}
export declare class UpdateFeedbackRuleDto {
    group: 'employee' | 'manager';
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';
    enabled: boolean;
    scope?: FeedbackRuleScopeDto;
}
