export const ManagerPermissions = [
  'ess.login',
  // Announcements (read)
  'announcements.read',
  'announcements.category.read',

  // Attendance
  'attendance.clockin',
  'attendance.clockout',
  'attendance.read',

  // Assets
  'assets.read',
  'assets.manage',
  'assets.request.manage',
  'assets.request.read',
  'assets.report.read',
  'assets.report.manage',

  // Employee Shifts & Shifts (read)
  'employee_shifts.read',
  'shifts.read',

  // Reports (attendance)
  'reports.attendance.read',

  // Expenses (read & create)
  'expenses.read',
  'expenses.create',
  'expenses.settings',

  // Leave (read & approve their team’s)
  'leave.balance.read',
  'leave.request.read_all',
  'leave.request.read_employee',
  'leave.settings',
  'holidays.read',
  'reserved_days.read',

  // Company & Org (read-only)
  'company.read',
  'company.summary',
  'locations.read',
  'department.read',
  'department.hierarchy',
  'org_chart.read',

  // Job Roles (read-only)
  'job_roles.read',

  // Employees (read their direct reports)
  'employees.read_employee',
  'employees.read_self',

  // Payroll – Payslips (self only)
  'payroll.payslips.read_self',

  // Salary Advance (self only)
  'salary_advance.request',
  'salary_advance.read_employee',
  'salary_advance.read_one',
  'salary_advance.repay',
  'salary_advance.history_employee',

  // Tax (read-only)
  'tax.read',

  // Payroll Settings (read-only)
  'payroll_settings.read',

  // Performance (view own performance dashboard, manage team goals)
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
];
