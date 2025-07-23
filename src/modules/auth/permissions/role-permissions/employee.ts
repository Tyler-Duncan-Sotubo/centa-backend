export const EmployeeRolePermissions = [
  // Announcements (read & react)
  'announcements.read',
  'announcements.react',
  'announcements.category.read',
  'announcements.comment',

  // Benefits
  'benefits.read',
  'benefit_groups.read',
  'benefits.enroll',

  // Attendance (clock in/out, view own)
  'attendance.clockin',
  'attendance.clockout',
  'attendance.read',

  // Assets
  'assets.read',
  'assets.request.manage',
  'assets.request.read',
  'assets.report.read',
  'assets.report.manage',

  // Employee Shifts (view own)
  'employee_shifts.read',
  'shifts.read',

  // Expenses (create & view own)
  'expenses.create',
  'expenses.read',
  'expenses.settings',

  // Leave (request & view own)
  'leave.balance.read',
  'leave.request.create',
  'leave.request.read_employee',
  'leave.settings',
  'holidays.read',

  // Company & Org (view basic)
  'company.read',
  'locations.read',
  'department.read',
  'org_chart.read',

  // Job Roles (view-only)
  'job_roles.read',

  // Employees (view self only)
  'employees.read_self',

  // Payroll – Payslips (self only)
  'payroll.payslips.read_self',

  // Salary Advance (request, view own, repay)
  'salary_advance.request',
  'salary_advance.read_employee',
  'salary_advance.read_one',
  'salary_advance.repay',
  'salary_advance.history_employee',

  // Tax (view own)
  'tax.read',

  // Payroll Settings (view-only)
  'payroll_settings.read',
];
