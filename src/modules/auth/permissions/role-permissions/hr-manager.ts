export const HrManagerPermissions = [
  // Announcements (read & comment)
  'announcements.read',
  'announcements.comment',
  'announcements.category.read',
  'announcements.comment',

  // Benefits
  'benefits.read',
  'benefit_groups.read',
  'benefits.enroll',

  // Attendance
  'attendance.clockin',
  'attendance.clockout',
  'attendance.read',
  'attendance.settings',

  // Employee Shifts & Shifts (read/assign)
  'employee_shifts.read',
  'employee_shifts.assign',
  'shifts.read',

  // Reports (attendance)
  'reports.attendance.read',
  'reports.attendance.download',

  // Expenses
  'expenses.read',
  'expenses.manage',
  'expenses.bulk_upload',
  'expenses.settings',

  // Leave (balance/access/manage)
  'leave.balance.read',
  'leave.balance.accrual',
  'leave.blocked_days.read',
  'leave.blocked_days.manage',
  'leave.policy.read',
  'leave.policy.manage',
  'leave.request.create',
  'leave.request.read_all',
  'leave.request.read_employee',
  'leave.settings',
  'leave.types.read',
  'holidays.read',
  'holidays.manage',
  'reserved_days.read',
  'reserved_days.manage',

  // Company & Org (read/manage)
  'company.read',
  'company.summary',
  'company.elements',
  'locations.read',
  'locations.manage',
  'locations.managers',
  'company_tax.read',
  'company_tax.manage',
  'cost_center.read',
  'cost_center.manage',
  'department.read',
  'department.manage',
  'department.hierarchy',
  'org_chart.read',

  // Job Roles
  'job_roles.read',
  'job_roles.manage',

  // Employees (read_all/manage)
  'employees.read_all',
  'employees.read_self',
  'employees.read_full',
  'employees.read_one',
  'employees.manage',
  'employees.assign_manager',
  'employees.fallback_managers',
  'employees.search',

  // Payroll – Allowances & Bonuses
  'payroll.allowances.read',
  'payroll.allowances.manage',
  'payroll.bonuses.read',
  'payroll.bonuses.manage',

  // Payroll – Deductions
  'payroll.deductions.types.read',
  'payroll.deductions.types.manage',
  'payroll.deductions.employee.read',
  'payroll.deductions.employee.manage',

  // Payroll – Off-Cycle
  'payroll.off_cycle.read',
  'payroll.off_cycle.manage',

  // Payroll – Pay Groups
  'payroll.pay_groups.read',
  'payroll.pay_groups.manage',

  // Payroll – Pay Schedules
  'payroll.pay_schedules.read',
  'payroll.pay_schedules.manage',

  // Payroll – Adjustments & Overrides
  'payroll.adjustments.read',
  'payroll.adjustments.manage',
  'payroll.overrides.read',
  'payroll.overrides.manage',

  // Payroll – Payslips
  'payroll.payslips.read_all',
  'payroll.payslips.read_self',

  // Payroll – Reports
  'payroll.reports.read',

  // Payroll – Run (read/send/approve)
  'payroll.run.calculate',
  'payroll.run.read',
  'payroll.run.send_for_approval',
  'payroll.run.approve',
  'payroll.run.mark_in_progress',
  'payroll.run.approval_status',
  'payroll.run.update_payment_status',

  // Salary Advance
  'salary_advance.request',
  'salary_advance.read_all',
  'salary_advance.read_employee',
  'salary_advance.read_one',
  'salary_advance.repay',
  'salary_advance.history',
  'salary_advance.history_employee',

  // Tax
  'tax.read',
  'tax.manage',
  'tax.download',

  // Payroll Settings
  'payroll_settings.read',
];
