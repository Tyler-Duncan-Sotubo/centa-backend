export const HrManagerPermissions = [
  // Access
  'ess.login',
  'dashboard.login',

  // Announcements
  'announcements.read',
  'announcements.category.read',
  'announcements.comment',
  'announcements.react',
  'announcements.manage',

  // Attendance
  'attendance.read',
  'attendance.manage',
  'attendance.settings',
  'attendance.clockin',
  'attendance.clockout',

  // Leave (policies + approvals)
  'leave.balance.read',
  'leave.request.create',
  'leave.request.read_employee',
  'leave.request.read_all',
  'leave_approval.manage',
  'leave.types.read',
  'leave.types.manage',
  'leave.policy.read',
  'leave.policy.manage',
  'leave.blocked_days.read',
  'leave.blocked_days.manage',
  'reserved_days.read',
  'reserved_days.manage',
  'holidays.read',
  'holidays.manage',
  'holidays.seed',
  'leave.reports',
  'leave.balance.accrual',

  // Company & Org
  'company.read',
  'company.summary',
  'locations.read',
  'locations.manage',
  'department.read',
  'department.manage',
  'department.hierarchy',
  'org_chart.read',
  'job_roles.read',
  'job_roles.manage',

  // Employees (HR ownership)
  'employees.read_self',
  'employees.read_one',
  'employees.read_all',
  'employees.read_full',
  'employees.search',
  'employees.manage',
  'employees.assign_manager',
  'employees.generate_id',
  'employees.bulk_create',
  'employees.download_template',
  'employees.fallback_managers',

  // Scheduling / Shifts
  'employee_shifts.read',
  'employee_shifts.manage',
  'employee_shifts.assign',
  'shifts.read',
  'shifts.manage',

  // Recruitment
  'jobs.read',
  'jobs.manage',
  'applications.read',
  'applications.manage',
  'interviews.read',
  'interviews.manage',
  'interviews.schedule',
  'interviews.submit_feedback',
  'offers.read',
  'offers.manage',

  // Benefits
  'benefits.read',
  'benefits.enroll',
  'benefit_groups.read',
  'benefit_groups.manage',
  'benefit_plans.manage',

  // Assets (HR-led requests + reporting)
  'assets.read',
  'assets.request.read',
  'assets.request.manage',
  'assets.report.read',
  'assets.manage',

  // Expenses (visibility only)
  'expenses.read',
  'expenses.manage',

  // Performance (team + org programs)
  'performance.read',
  'performance.settings',
  'performance.reminders.configure',
  'performance.cycles.read',
  'performance.cycles.manage',
  'performance.goals.read',
  'performance.goals.create',
  'performance.goals.edit',
  'performance.goals.approve',
  'performance.goals.manage_all',
  'performance.reviews.read',
  'performance.reviews.read_team',
  'performance.reviews.submit_self',
  'performance.reviews.submit_peer',
  'performance.reviews.submit_manager',
  'performance.reviews.manage_all',
  'performance.calibration.view',
  'performance.calibration.export',

  // Payroll (read-only)
  'payroll.run.read',
  'payroll.reports.read',
  'payroll.pay_groups.read',
  'payroll.pay_schedules.read',
  'payroll.overrides.read',
  'payroll.allowances.read',
  'payroll.bonuses.read',
  'payroll.payslips.read_all',
  'payroll_settings.read',
  'company_tax.read',
  'tax.read',
  'tax.download',
  'payroll.off_cycle.read',

  // Roles/permissions (limited)
  'roles.read',
  'roles.manage',
  'permissions.read',

  // Audit Logs
  'audit.logs.read',
];
