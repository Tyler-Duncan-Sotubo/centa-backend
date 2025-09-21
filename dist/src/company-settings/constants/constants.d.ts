export type TaskStatus = 'todo' | 'inProgress' | 'done' | 'skipped' | 'blocked';
export declare const ALLOWED_TASKS: {
    payroll: readonly ["pay_schedule", "pay_group", "salary_structure", "tax_details", "cost_center"];
    company: readonly ["company_locations", "departments", "job_roles"];
    employees: readonly ["upload_employees"];
};
export type ModuleKey = keyof typeof ALLOWED_TASKS;
export declare const REQUIRED: Record<ModuleKey, string[]>;
export declare const MODULE_SETTING_KEY: (m: ModuleKey) => string;
export declare const defaultModule: (module: ModuleKey) => {
    tasks: any;
    required: string[];
    completed: boolean;
    disabledWhenComplete: boolean;
};
