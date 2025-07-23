import { AnnouncementPermissions } from './permission-keys/announcements';
import { AssetPermissions } from './permission-keys/assets';
import { AttendancePermissions } from './permission-keys/attendance';
import { AuditPermissions } from './permission-keys/audit';
import { BenefitPermissions } from './permission-keys/benefits';
import { CompanyPermissions } from './permission-keys/company';
import { DepartmentPermissions } from './permission-keys/departments';
import { EmployeePermissions } from './permission-keys/employees';
import { ExpensePermissions } from './permission-keys/expenses';
import { JobRolePermissions } from './permission-keys/job_roles';
import { LeavePermissions } from './permission-keys/leave';
import { LocationPermissions } from './permission-keys/locations';
import { OrgChartPermissions } from './permission-keys/org_chart';
import { PayrollPermissions } from './permission-keys/payroll';
import { PermissionManagementPermissions } from './permission-keys/permission_management';
import { RecruitPermissions } from './permission-keys/recruit';
import { SalaryAdvancePermissions } from './permission-keys/salary_advance';
import { ShiftPermissions } from './permission-keys/shifts';
import { TaxPermissions } from './permission-keys/tax';
import { AdminPermissions } from './role-permissions/admin';
import { EmployeeRolePermissions } from './role-permissions/employee';
import { FinanceOfficerPermissions } from './role-permissions/finance-officer';
import { HrManagerPermissions } from './role-permissions/hr-manager';
import { ManagerPermissions } from './role-permissions/manager';
import { PayrollSpecialistPermissions } from './role-permissions/payroll-specialist';
import { RecruiterPermissions } from './role-permissions/recruiter';
import { SuperAdminPermissions } from './role-permissions/super-admin';

export const PermissionKeys = [
  ...AnnouncementPermissions,
  ...AssetPermissions,
  ...AuditPermissions,
  ...AttendancePermissions,
  ...BenefitPermissions,
  ...CompanyPermissions,
  ...DepartmentPermissions,
  ...EmployeePermissions,
  ...ExpensePermissions,
  ...JobRolePermissions,
  ...LeavePermissions,
  ...LocationPermissions,
  ...OrgChartPermissions,
  ...PayrollPermissions,
  ...PermissionManagementPermissions,
  ...SalaryAdvancePermissions,
  ...ShiftPermissions,
  ...TaxPermissions,
  ...RecruitPermissions,
] as const;

export const DefaultRolePermissions: Record<string, string[]> = {
  super_admin: SuperAdminPermissions,
  admin: AdminPermissions,
  hr_manager: HrManagerPermissions,
  manager: ManagerPermissions,
  employee: EmployeeRolePermissions,
  payroll_specialist: PayrollSpecialistPermissions,
  finance_officer: FinanceOfficerPermissions,
  recruiter: RecruiterPermissions,
};

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
