export type TaskStatus = 'todo' | 'inProgress' | 'done' | 'skipped' | 'blocked';

export const ALLOWED_TASKS = {
  payroll: [
    'pay_schedule',
    'pay_group',
    'salary_structure',
    'tax_details',
    'cost_center',
  ] as const,
  company: ['company_locations', 'departments', 'job_roles'] as const,
  employees: ['upload_employees'] as const,
};
export type ModuleKey = keyof typeof ALLOWED_TASKS;

export const REQUIRED: Record<ModuleKey, string[]> = {
  payroll: ['pay_schedule', 'pay_group', 'salary_structure', 'tax_details'],
  company: ['company_locations', 'departments', 'job_roles'],
  employees: ['upload_employees'],
};

export const MODULE_SETTING_KEY = (m: ModuleKey) => `onboarding.${m}`;

export const defaultModule = (module: ModuleKey) => ({
  tasks: Object.fromEntries(
    ALLOWED_TASKS[module].map((t) => [t, 'todo' as TaskStatus]),
  ),
  required: REQUIRED[module],
  completed: false, // derived; fine to store as false initially
  disabledWhenComplete: true,
});
