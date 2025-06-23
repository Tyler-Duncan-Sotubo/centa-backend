export const leave = [
  // Approvals
  { key: 'leave.approver', value: 'manager' }, // line_manager, hr, ceo, custom
  { key: 'leave.multi_level_approval', value: false }, // Enable or disable multi-level approval
  { key: 'leave.approver_chain', value: ['manager'] }, // Only used if multi-level is true

  // Auto-Approval
  { key: 'leave.auto_approve_after_days', value: 7 }, // Auto-approve if no action in 7 days

  // Entitlement / Balances
  { key: 'leave.default_annual_entitlement', value: 20 }, // Default 20 days leave/year
  { key: 'leave.allow_carryover', value: true }, // Allow carryover of unused leaves
  { key: 'leave.carryover_limit', value: 5 }, // Max 5 days carried to next year
  { key: 'leave.allow_negative_balance', value: false }, // Disallow leave into negative

  // Eligibility
  { key: 'leave.allow_unconfirmed_leave', value: false }, // Unconfirmed employees can't request
  {
    key: 'leave.allowed_leave_types_for_unconfirmed',
    value: ['Sick Leave', 'Unpaid Leave'],
  },

  // Days Options
  { key: 'leave.exclude_weekends', value: true },
  { key: 'leave.weekend_days', value: ['Saturday', 'Sunday'] },
  { key: 'leave.exclude_public_holidays', value: true },
  // Notifications
  {
    key: 'leave.notifications',
    value: {
      notifyApprover: true,
      notifyHr: false,
      notifyLineManager: false,
      notifyEmployeeOnDecision: true,
      notificationCcRoles: [],
      notificationChannels: ['email'],
    },
  },
  // Optional - if you want strict notice periods
  { key: 'leave.min_notice_days', value: 3 }, // Must request at least 3 days in advance
  { key: 'leave.max_consecutive_days', value: 30 }, // Can't take more than 30 days leave at once
];
