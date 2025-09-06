export const ManagerPermissions = [
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
  'attendance.manage',
  'attendance.clockin',
  'attendance.clockout',
  'attendance.read',

  // Assets (team requests + read-only reports)
  'assets.read',
  'assets.request.read',
  'assets.request.manage',
  'assets.report.read',

  // Shifts
  'employee_shifts.read',
  'employee_shifts.assign',
  'shifts.read',

  // Expenses (approve/manage team if your app uses this key for approvals)
  // If this is too broad in your system, split into submit/approve perms later.
  'expenses.read',
  'expenses.manage',

  // Leave (self + approve team)
  'leave.balance.read',
  'leave.request.create',
  'leave.request.read_employee',
  'leave.request.read_all',
  'leave_approval.manage',
  'holidays.read',
  'reserved_days.read',
  'reserved_days.manage',
  'leave.blocked_days.read',
  'leave.blocked_days.manage',
  'leave.types.read',
  'leave.policy.read',
  'leave.reports',

  // Company & Org (read-only)
  'company.read',
  'company.summary',
  'locations.read',
  'department.read',
  'department.hierarchy',
  'org_chart.read',

  // Employees (self + direct reports; server should restrict scope)
  'employees.read_self',
  'employees.read_one',
  'employees.search',

  // Payroll (self only)
  'payroll.payslips.read_self',

  // Salary advance (self)
  'salary_advance.request',
  'salary_advance.read_employee',
  'salary_advance.repay',
  'salary_advance.history_employee',

  // Performance (team)
  'performance.read',
  'performance.goals.create',
  'performance.goals.edit',
  'performance.goals.read',
  'performance.goals.approve',
  'performance.reviews.submit_self',
  'performance.reviews.submit_peer',
  'performance.reviews.submit_manager',
  'performance.reviews.read',
  'performance.reviews.read_team',
  'performance.calibration.view',

  // Hiring (light)
  'jobs.read',
  'applications.read',
  'interviews.read',
  'interviews.schedule',
  'interviews.submit_feedback',
  'offers.read',

  // Benefits (self + read group info)
  'benefits.read',
  'benefits.enroll',
  'benefit_groups.read',

  // Read-only settings where safe
  'payroll_settings.read',
  'tax.read',
];
