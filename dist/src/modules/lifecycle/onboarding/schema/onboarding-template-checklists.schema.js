"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeChecklistStatus = exports.onboardingTemplateChecklists = exports.checklistStatusEnum = exports.checklistAssigneeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const onboarding_templates_schema_1 = require("./onboarding-templates.schema");
exports.checklistAssigneeEnum = (0, pg_core_1.pgEnum)('checklist_assignee', [
    'employee',
    'hr',
    'it',
    'finance',
]);
exports.checklistStatusEnum = (0, pg_core_1.pgEnum)('checklist_status', [
    'pending',
    'in_progress',
    'completed',
    'overdue',
    'skipped',
    'cancelled',
]);
exports.onboardingTemplateChecklists = (0, pg_core_1.pgTable)('onboarding_template_checklists', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => onboarding_templates_schema_1.onboardingTemplates.id, { onDelete: 'cascade' }),
    title: (0, pg_core_1.text)('title').notNull(),
    assignee: (0, exports.checklistAssigneeEnum)('assignee').default('employee'),
    order: (0, pg_core_1.integer)('order').default(0),
    dueDaysAfterStart: (0, pg_core_1.integer)('due_days_after_start').default(1),
}, (t) => [
    (0, pg_core_1.index)('onboarding_template_checklists_template_id_idx').on(t.templateId),
]);
exports.employeeChecklistStatus = (0, pg_core_1.pgTable)('employee_checklist_status', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    checklistId: (0, pg_core_1.uuid)('checklist_id').notNull(),
    status: (0, exports.checklistStatusEnum)('status').default('pending'),
    completedAt: (0, pg_core_1.timestamp)('completed_at').defaultNow(),
}, (t) => [(0, pg_core_1.index)('employee_checklist_status_employee_id_idx').on(t.employeeId)]);
//# sourceMappingURL=onboarding-template-checklists.schema.js.map