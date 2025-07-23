export const PayrollSpecialistPermissions = [
  // Announcements (read & comment)
  'announcements.read',
  'announcements.comment',
  'announcements.category.read',

  // Attendance (view & manage)
  'attendance.read',
  'attendance.settings',

  // Employee Shifts & Shifts (view & assign)
  'employee_shifts.read',
  'employee_shifts.assign',
  'shifts.read',

  // Expenses (view & manage)
  'expenses.read',
  'expenses.manage',
  'expenses.bulk_upload',
  'expenses.settings',

  // Leave (balance & blocked days read/approve)
  'leave.balance.read',
  'leave.blocked_days.read',
  'leave.blocked_days.manage',
  'leave.policy.read',
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

  // Employees (view all & assign manager)
  'employees.read_all',
  'employees.read_one',
  'employees.assign_manager',
  'employees.fallback_managers',
  'employees.search',

  // Payroll – Allowances & Bonuses (read & manage)
  'payroll.allowances.read',
  'payroll.allowances.manage',
  'payroll.bonuses.read',
  'payroll.bonuses.manage',

  // Payroll – Deductions (read & manage)
  'payroll.deductions.types.read',
  'payroll.deductions.types.manage',
  'payroll.deductions.employee.read',
  'payroll.deductions.employee.manage',

  // Payroll – Off-Cycle (read & manage)
  'payroll.off_cycle.read',
  'payroll.off_cycle.manage',

  // Payroll – Pay Groups & Pay Schedules (read & manage)
  'payroll.pay_groups.read',
  'payroll.pay_groups.manage',
  'payroll.pay_schedules.read',
  'payroll.pay_schedules.manage',

  // Payroll – Adjustments & Overrides (read & manage)
  'payroll.adjustments.read',
  'payroll.adjustments.manage',
  'payroll.overrides.read',
  'payroll.overrides.manage',

  // Payroll – Payslips (company-level view)
  'payroll.payslips.read_all',

  // Payroll – Run (view & calculate/send for approval)
  'payroll.run.calculate',
  'payroll.run.read',
  'payroll.run.send_for_approval',
  'payroll.run.approval_status',

  // Payroll – Reports (financial summaries)
  'payroll.reports.read',

  // Salary Advance (view & manage employee advances)
  'salary_advance.read_all',
  'salary_advance.read_employee',
  'salary_advance.repay',
  'salary_advance.history',
  'salary_advance.history_employee',

  // Tax (read & manage filings)
  'tax.read',
  'tax.manage',
  'tax.download',

  // Payroll Settings (view & manage)
  'payroll_settings.read',
  'payroll_settings.manage',
];
