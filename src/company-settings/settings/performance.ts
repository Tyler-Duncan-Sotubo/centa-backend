export const performance = [
  { key: 'performance.auto_create_cycles', value: true },
  { key: 'performance.review_frequency', value: 'quarterly' }, // annual | quarterly | monthly | etc.
  { key: 'performance.enable_self_review', value: true },
  { key: 'performance.require_review_rating', value: true },
  { key: 'performance.review_score_scale', value: 100 }, // 3, 5, 10, or 100

  // Email reminders - Reviews
  { key: 'performance.notify_review_overdue', value: ['employee', 'manager'] },
  { key: 'performance.notify_review_upcoming', value: ['employee'] },
  { key: 'performance.review_reminder_offset_days', value: 3 },

  // Email reminders - Goals
  { key: 'performance.notify_goal_updated_by_employee', value: ['manager'] },
  { key: 'performance.goal_reminder_frequency', value: 'weekly' }, // weekly | monthly | custom

  // 🔁 NEW Appraisal Automation Overrides
  { key: 'performance.auto_create_appraisals', value: true },
  { key: 'performance.appraisal_include_new_employees', value: true },
  { key: 'performance.default_manager_assignment', value: true },
  { key: 'performance.allow_manager_override', value: true },
  { key: 'performance.auto_finalize_deadline_days', value: 5 },
];
