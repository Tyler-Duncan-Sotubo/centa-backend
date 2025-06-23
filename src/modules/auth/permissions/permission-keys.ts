export const PermissionKeys = [
  // Announcements
  'announcements.read',
  'announcements.comment',
  'announcements.react',
  'announcements.category.read',
  'announcements.manage',

  // Assets
  'assets.read',
  'assets.manage',
  'assets.request.manage',
  'assets.request.read',
  'assets.report.read',
  'assets.report.manage',

  // Audit
  'audit.logs.read',
  'audit.auth.read',

  // Benefits
  'benefits.read',
  'benefits.enroll',
  'benefit_groups.read',
  'benefit_groups.manage',
  'benefit_plans.manage', // TODO

  // Attendance
  'attendance.clockin',
  'attendance.clockout',
  'attendance.read',
  'attendance.manage',
  'attendance.settings',

  // Employee Shifts & Shifts
  'employee_shifts.read',
  'employee_shifts.assign',
  'employee_shifts.manage', // TODO
  'shifts.read',
  'shifts.manage',

  // Reports (Attendance)
  'reports.attendance.read',
  'reports.attendance.download',

  // Expenses
  'expenses.read',
  'expenses.manage',
  'expenses.bulk_upload',
  'expenses.settings',

  // Leave
  'leave.balance.read',
  'leave.balance.accrual',
  'leave.blocked_days.read',
  'leave.blocked_days.manage',
  'leave.policy.read',
  'leave.policy.manage',
  'leave.reports',
  'leave_approval.manage', // TODO
  'leave.request.create',
  'leave.request.read_all',
  'leave.request.read_employee',
  'leave.settings',
  'leave.types.read',
  'leave.types.manage',
  'holidays.read',
  'holidays.manage',
  'holidays.seed',
  'reserved_days.read',
  'reserved_days.manage',

  // Company & Org
  'company.read',
  'company.manage',
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

  // Employees
  'employees.download_template',
  'employees.bulk_create',
  'employees.generate_id',
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

  // Payroll – Run
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
  'salary_advance.manage', // create/update/delete centrally
  'salary_advance.repay',
  'salary_advance.history',
  'salary_advance.history_employee',

  // Tax
  'tax.read',
  'tax.manage',
  'tax.download',

  // Payroll Settings
  'payroll_settings.read',
  'payroll_settings.manage',

  // Permissions
  'permissions.read',
  'permissions.manage',
  'roles.read',
  'roles.manage',
  // Dashboard Access
];

export enum Permission {
  // Announcements
  AnnouncementsCategoryRead = 'announcements.category.read',
  AnnouncementsComment = 'announcements.comment',
  AnnouncementsManage = 'announcements.manage',
  AnnouncementsReact = 'announcements.react',
  AnnouncementsRead = 'announcements.read',

  // Assets
  AssetsManage = 'assets.manage',
  AssetsRead = 'assets.read',
  AssetsReportManage = 'assets.report.manage',
  AssetsReportRead = 'assets.report.read',
  AssetsRequestManage = 'assets.request.manage',
  AssetsRequestRead = 'assets.request.read',

  // Attendance
  AttendanceClockIn = 'attendance.clockin',
  AttendanceClockOut = 'attendance.clockout',
  AttendanceManage = 'attendance.manage',
  AttendanceRead = 'attendance.read',
  AttendanceSettings = 'attendance.settings',

  // Audit
  AuditAuthRead = 'audit.auth.read',
  AuditLogsRead = 'audit.logs.read',

  // Benefits
  BenefitGroupsManage = 'benefit_groups.manage',
  BenefitGroupsRead = 'benefit_groups.read',
  BenefitPlansManage = 'benefit_plans.manage',
  BenefitsEnroll = 'benefits.enroll',
  BenefitsRead = 'benefits.read',

  // Company & Org
  CompanyElements = 'company.elements',
  CompanyManage = 'company.manage',
  CompanyRead = 'company.read',
  CompanySummary = 'company.summary',
  CompanyTaxManage = 'company_tax.manage',
  CompanyTaxRead = 'company_tax.read',
  CostCenterManage = 'cost_center.manage',
  CostCenterRead = 'cost_center.read',
  DepartmentHierarchy = 'department.hierarchy',
  DepartmentManage = 'department.manage',
  DepartmentRead = 'department.read',
  LocationsManage = 'locations.manage',
  LocationsManagers = 'locations.managers',
  LocationsRead = 'locations.read',
  OrgChartRead = 'org_chart.read',

  // Employees
  EmployeesAssignManager = 'employees.assign_manager',
  EmployeesBulkCreate = 'employees.bulk_create',
  EmployeesDownloadTemplate = 'employees.download_template',
  EmployeesFallbackManagers = 'employees.fallback_managers',
  EmployeesGenerateId = 'employees.generate_id',
  EmployeesManage = 'employees.manage',
  EmployeesReadAll = 'employees.read_all',
  EmployeesReadFull = 'employees.read_full',
  EmployeesReadOne = 'employees.read_one',
  EmployeesReadSelf = 'employees.read_self',
  EmployeesSearch = 'employees.search',

  // Employee Shifts & Shifts
  EmployeeShiftsAssign = 'employee_shifts.assign',
  EmployeeShiftsManage = 'employee_shifts.manage',
  EmployeeShiftsRead = 'employee_shifts.read',
  ShiftsManage = 'shifts.manage',
  ShiftsRead = 'shifts.read',

  // Expenses
  ExpensesBulkUpload = 'expenses.bulk_upload',
  ExpensesManage = 'expenses.manage',
  ExpensesRead = 'expenses.read',
  ExpensesSettings = 'expenses.settings',

  // Holidays / Reserved Days
  HolidaysManage = 'holidays.manage',
  HolidaysRead = 'holidays.read',
  HolidaysSeed = 'holidays.seed',
  ReservedDaysManage = 'reserved_days.manage',
  ReservedDaysRead = 'reserved_days.read',

  // Job Roles
  JobRolesManage = 'job_roles.manage',
  JobRolesRead = 'job_roles.read',

  // Leave
  LeaveBalanceAccrual = 'leave.balance.accrual',
  LeaveBalanceRead = 'leave.balance.read',
  LeaveBlockedDaysManage = 'leave.blocked_days.manage',
  LeaveBlockedDaysRead = 'leave.blocked_days.read',
  LeavePolicyManage = 'leave.policy.manage',
  LeavePolicyRead = 'leave.policy.read',
  LeaveReports = 'leave.reports',
  LeaveRequestCreate = 'leave.request.create',
  LeaveRequestReadAll = 'leave.request.read_all',
  LeaveRequestReadEmployee = 'leave.request.read_employee',
  LeaveSettings = 'leave.settings',
  LeaveTypesManage = 'leave.types.manage',
  LeaveTypesRead = 'leave.types.read',
  LeaveApprovalManage = 'leave_approval.manage',

  // Payroll – Adjustments & Overrides
  PayrollAdjustmentsManage = 'payroll.adjustments.manage',
  PayrollAdjustmentsRead = 'payroll.adjustments.read',
  PayrollOverridesManage = 'payroll.overrides.manage',
  PayrollOverridesRead = 'payroll.overrides.read',

  // Payroll – Allowances & Bonuses
  PayrollAllowancesManage = 'payroll.allowances.manage',
  PayrollAllowancesRead = 'payroll.allowances.read',
  PayrollBonusesManage = 'payroll.bonuses.manage',
  PayrollBonusesRead = 'payroll.bonuses.read',

  // Payroll – Deductions
  PayrollDeductionsEmployeeManage = 'payroll.deductions.employee.manage',
  PayrollDeductionsEmployeeRead = 'payroll.deductions.employee.read',
  PayrollDeductionsTypesManage = 'payroll.deductions.types.manage',
  PayrollDeductionsTypesRead = 'payroll.deductions.types.read',

  // Payroll – Off-Cycle
  PayrollOffCycleManage = 'payroll.off_cycle.manage',
  PayrollOffCycleRead = 'payroll.off_cycle.read',

  // Payroll – Pay Groups
  PayrollPayGroupsManage = 'payroll.pay_groups.manage',
  PayrollPayGroupsRead = 'payroll.pay_groups.read',

  // Payroll – Pay Schedules
  PayrollPaySchedulesManage = 'payroll.pay_schedules.manage',
  PayrollPaySchedulesRead = 'payroll.pay_schedules.read',

  // Payroll – Payslips
  PayrollPayslipsReadAll = 'payroll.payslips.read_all',
  PayrollPayslipsReadSelf = 'payroll.payslips.read_self',

  // Payroll – Reports
  PayrollReportsRead = 'payroll.reports.read',

  // Payroll – Run
  PayrollRunApprovalStatus = 'payroll.run.approval_status',
  PayrollRunApprove = 'payroll.run.approve',
  PayrollRunCalculate = 'payroll.run.calculate',
  PayrollRunMarkInProgress = 'payroll.run.mark_in_progress',
  PayrollRunRead = 'payroll.run.read',
  PayrollRunSendForApproval = 'payroll.run.send_for_approval',
  PayrollRunUpdatePaymentStatus = 'payroll.run.update_payment_status',

  // Payroll Settings
  PayrollSettingsManage = 'payroll_settings.manage',
  PayrollSettingsRead = 'payroll_settings.read',

  // Permissions
  PermissionsManage = 'permissions.manage',
  PermissionsRead = 'permissions.read',
  RolesManage = 'roles.manage',
  RolesRead = 'roles.read',

  // Salary Advance
  SalaryAdvanceHistory = 'salary_advance.history',
  SalaryAdvanceHistoryEmployee = 'salary_advance.history_employee',
  SalaryAdvanceManage = 'salary_advance.manage',
  SalaryAdvanceReadAll = 'salary_advance.read_all',
  SalaryAdvanceReadEmployee = 'salary_advance.read_employee',
  SalaryAdvanceReadOne = 'salary_advance.read_one',
  SalaryAdvanceRepay = 'salary_advance.repay',
  SalaryAdvanceRequest = 'salary_advance.request',

  // Tax
  TaxDownload = 'tax.download',
  TaxManage = 'tax.manage',
  TaxRead = 'tax.read',
}

export const DefaultRolePermissions: Record<string, string[]> = {
  super_admin: [
    // Announcements
    'announcements.read',
    'announcements.comment',
    'announcements.react',
    'announcements.category.read',
    'announcements.manage',

    // Assets
    'assets.read',
    'assets.manage',
    'assets.request.manage',
    'assets.request.read',
    'assets.report.read',
    'assets.report.manage',

    // Audit
    'audit.logs.read',
    'audit.auth.read',

    // Benefits
    'benefits.read',
    'benefits.enroll',
    'benefit_groups.read',
    'benefit_groups.manage',
    'benefit_plans.manage',

    // Attendance
    'attendance.clockin',
    'attendance.clockout',
    'attendance.read',
    'attendance.manage',
    'attendance.settings',

    // Employee Shifts & Shifts
    'employee_shifts.read',
    'employee_shifts.assign',
    'employee_shifts.manage',
    'shifts.read',
    'shifts.manage',

    // Reports (Attendance)
    'reports.attendance.read',
    'reports.attendance.download',

    // Expenses
    'expenses.read',
    'expenses.manage',
    'expenses.bulk_upload',
    'expenses.settings',

    // Leave
    'leave.balance.read',
    'leave.balance.accrual',
    'leave.blocked_days.read',
    'leave.blocked_days.manage',
    'leave.policy.read',
    'leave.policy.manage',
    'leave.reports',
    'leave_approval.manage',
    'leave.request.create',
    'leave.request.read_all',
    'leave.request.read_employee',
    'leave.settings',
    'leave.types.read',
    'leave.types.manage',
    'holidays.read',
    'holidays.manage',
    'holidays.seed',
    'reserved_days.read',
    'reserved_days.manage',

    // Company & Org
    'company.read',
    'company.manage',
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

    // Employees
    'employees.download_template',
    'employees.bulk_create',
    'employees.generate_id',
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

    // Payroll – Run
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
    'salary_advance.manage',
    'salary_advance.repay',
    'salary_advance.history',
    'salary_advance.history_employee',

    // Tax
    'tax.read',
    'tax.manage',
    'tax.download',

    // Payroll Settings
    'payroll_settings.read',
    'payroll_settings.manage',

    // Permissions
    'permissions.read',
    'permissions.manage',
    'roles.read',
    'roles.manage',
  ],

  admin: [
    // Announcements
    'announcements.read',
    'announcements.comment',
    'announcements.react',
    'announcements.category.read',

    // Assets
    'assets.read',
    'assets.manage',
    'assets.request.manage',
    'assets.request.read',
    'assets.report.read',
    'assets.report.manage',

    // Audit (read only)
    'audit.logs.read',
    'audit.auth.read',

    // Benefits
    'benefits.read',
    'benefits.enroll',
    'benefit_groups.read',
    'benefit_plans.manage',

    // Attendance
    'attendance.clockin',
    'attendance.clockout',
    'attendance.read',
    'attendance.settings',

    // Employee Shifts & Shifts (read/assign)
    'employee_shifts.read',
    'employee_shifts.assign',
    'employee_shifts.manage',
    'shifts.read',

    // Reports (attendance) read
    'reports.attendance.read',
    'reports.attendance.download',

    // Expenses
    'expenses.read',
    'expenses.manage',
    'expenses.bulk_upload',
    'expenses.settings',

    // Leave (read & request)
    'leave.balance.read',
    'leave.blocked_days.read',
    'leave.policy.read',
    'leave.reports',
    'leave.request.create',
    'leave_approval.manage',
    'leave.request.read_all',
    'leave.request.read_employee',
    'leave.settings',
    'leave.types.read',
    'holidays.read',
    'holidays.manage',
    'reserved_days.read',

    // Company & Org
    'company.read',
    'company.manage',
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

    // Employees
    'employees.download_template',
    'employees.bulk_create',
    'employees.generate_id',
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
    'salary_advance.manage',
    'salary_advance.repay',
    'salary_advance.history',
    'salary_advance.history_employee',

    // Tax
    'tax.read',
    'tax.manage',
    'tax.download',

    // Payroll Settings
    'payroll_settings.read',
    'payroll_settings.manage',

    // Permissions
    'permissions.read',
    'permissions.manage',
    'roles.read',
    'roles.manage',
  ],

  hr_manager: [
    // Announcements (read & comment)
    'announcements.read',
    'announcements.comment',
    'announcements.category.read',

    // Benefits
    'benefits.read',
    'benefit_groups.read',

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
  ],

  manager: [
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
  ],

  employee: [
    // Announcements (read & react)
    'announcements.read',
    'announcements.react',
    'announcements.category.read',

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
  ],

  payroll_specialist: [
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
  ],

  finance_officer: [
    // Announcements (read)
    'announcements.read',
    'announcements.category.read',

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
  ],
};
