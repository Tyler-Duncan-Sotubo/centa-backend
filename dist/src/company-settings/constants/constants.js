"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultModule = exports.MODULE_SETTING_KEY = exports.REQUIRED = exports.ALLOWED_TASKS = void 0;
exports.ALLOWED_TASKS = {
    payroll: [
        'pay_schedule',
        'pay_group',
        'salary_structure',
        'tax_details',
        'cost_center',
    ],
    company: ['company_locations', 'departments', 'job_roles'],
    employees: ['upload_employees'],
};
exports.REQUIRED = {
    payroll: ['pay_schedule', 'pay_group', 'salary_structure', 'tax_details'],
    company: ['company_locations', 'departments', 'job_roles'],
    employees: ['upload_employees'],
};
const MODULE_SETTING_KEY = (m) => `onboarding.${m}`;
exports.MODULE_SETTING_KEY = MODULE_SETTING_KEY;
const defaultModule = (module) => ({
    tasks: Object.fromEntries(exports.ALLOWED_TASKS[module].map((t) => [t, 'todo'])),
    required: exports.REQUIRED[module],
    completed: false,
    disabledWhenComplete: true,
});
exports.defaultModule = defaultModule;
//# sourceMappingURL=constants.js.map