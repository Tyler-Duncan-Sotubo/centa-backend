export type TaskStatus = 'todo' | 'inProgress' | 'done' | 'skipped' | 'blocked';

export const EXTRA_KEYS = [
  'onboarding_templates',
  'offboarding_process',
  'general_settings',
  'pay_adjustments',
  'performance_general',
  'goal_policies',
  'feedback_settings',
  'competency',
  'performance_templates',
  'appraisal_framework',
  'start_1_1_checkin',
  'pipeline',
  'scorecards',
  'email_templates',
  'offer_templates',
  'create_jobs',
  'attendance_setting',
  'shift_management',
  'assign_rota',
  'add_office_location',
  'leave_settings',
  'leave_types_policies',
  'holidays',
  'blocked_days',
  'reserved_days',
] as const;

export type ExtraKey = (typeof EXTRA_KEYS)[number];
