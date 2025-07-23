export const FinanceOfficerPermissions = [
  // Announcements (read)
  'announcements.read',
  'announcements.react',
  'announcements.category.read',
  'announcements.comment',

  // Attendance (view only)
  'attendance.read',

  // Employee Shifts & Shifts (view only)
  'employee_shifts.read',
  'shifts.read',

  // Expenses (view & approve)
  'expenses.read',
  'expenses.approve',
  'expenses.settings',

  // Leave (read balances & reports)
  'leave.balance.read',
  'leave.reports',
  'leave.request.read_all',
  'leave.request.read_employee',
  'leave.settings',
  'leave.types.read',
  'holidays.read',
  'reserved_days.read',

  // Company & Org (read-only)
  'company.read',
  'company.summary',
  'company.elements',
  'locations.read',
  'department.read',
  'department.hierarchy',
  'org_chart.read',

  // Job Roles (read-only)
  'job_roles.read',

  // Employees (view all & fallback managers)
  'employees.read_all',
  'employees.read_one',
  'employees.fallback_managers',
  'employees.search',

  // Payroll – Allowances & Bonuses (view)
  'payroll.allowances.read',
  'payroll.bonuses.read',

  // Payroll – Deductions (view summaries)
  'payroll.deductions.types.read',
  'payroll.deductions.employee.read',

  // Payroll – Off-Cycle (view only)
  'payroll.off_cycle.read',

  // Payroll – Pay Groups & Pay Schedules (view only)
  'payroll.pay_groups.read',
  'payroll.pay_schedules.read',

  // Payroll – Adjustments & Overrides (view only)
  'payroll.adjustments.read',
  'payroll.overrides.read',

  // Payroll – Payslips (company-level view)
  'payroll.payslips.read_all',

  // Payroll – Run (view & approval status)
  'payroll.run.read',
  'payroll.run.approval_status',

  // Payroll – Reports
  'payroll.reports.read',

  // Salary Advance (view only)
  'salary_advance.read_all',
  'salary_advance.read_employee',
  'salary_advance.history',

  // Tax (view & download)
  'tax.read',
  'tax.download',

  // Payroll Settings (view only)
  'payroll_settings.read',
];
