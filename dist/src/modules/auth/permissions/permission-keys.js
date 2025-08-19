"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = exports.DefaultRolePermissions = exports.PermissionKeys = void 0;
const announcements_1 = require("./permission-keys/announcements");
const assets_1 = require("./permission-keys/assets");
const attendance_1 = require("./permission-keys/attendance");
const audit_1 = require("./permission-keys/audit");
const benefits_1 = require("./permission-keys/benefits");
const company_1 = require("./permission-keys/company");
const departments_1 = require("./permission-keys/departments");
const employees_1 = require("./permission-keys/employees");
const expenses_1 = require("./permission-keys/expenses");
const job_roles_1 = require("./permission-keys/job_roles");
const leave_1 = require("./permission-keys/leave");
const locations_1 = require("./permission-keys/locations");
const org_chart_1 = require("./permission-keys/org_chart");
const payroll_1 = require("./permission-keys/payroll");
const permission_management_1 = require("./permission-keys/permission_management");
const recruit_1 = require("./permission-keys/recruit");
const salary_advance_1 = require("./permission-keys/salary_advance");
const shifts_1 = require("./permission-keys/shifts");
const tax_1 = require("./permission-keys/tax");
const admin_1 = require("./role-permissions/admin");
const employee_1 = require("./role-permissions/employee");
const finance_officer_1 = require("./role-permissions/finance-officer");
const hr_manager_1 = require("./role-permissions/hr-manager");
const manager_1 = require("./role-permissions/manager");
const payroll_specialist_1 = require("./role-permissions/payroll-specialist");
const recruiter_1 = require("./role-permissions/recruiter");
const super_admin_1 = require("./role-permissions/super-admin");
const performance_1 = require("./permission-keys/performance");
exports.PermissionKeys = [
    'ess.login',
    'dashboard.login',
    ...announcements_1.AnnouncementPermissions,
    ...assets_1.AssetPermissions,
    ...audit_1.AuditPermissions,
    ...attendance_1.AttendancePermissions,
    ...benefits_1.BenefitPermissions,
    ...company_1.CompanyPermissions,
    ...departments_1.DepartmentPermissions,
    ...employees_1.EmployeePermissions,
    ...expenses_1.ExpensePermissions,
    ...job_roles_1.JobRolePermissions,
    ...leave_1.LeavePermissions,
    ...locations_1.LocationPermissions,
    ...org_chart_1.OrgChartPermissions,
    ...payroll_1.PayrollPermissions,
    ...permission_management_1.PermissionManagementPermissions,
    ...salary_advance_1.SalaryAdvancePermissions,
    ...shifts_1.ShiftPermissions,
    ...tax_1.TaxPermissions,
    ...recruit_1.RecruitPermissions,
    ...performance_1.PerformancePermissions,
];
exports.DefaultRolePermissions = {
    super_admin: super_admin_1.SuperAdminPermissions,
    admin: admin_1.AdminPermissions,
    hr_manager: hr_manager_1.HrManagerPermissions,
    manager: manager_1.ManagerPermissions,
    employee: employee_1.EmployeeRolePermissions,
    payroll_specialist: payroll_specialist_1.PayrollSpecialistPermissions,
    finance_officer: finance_officer_1.FinanceOfficerPermissions,
    recruiter: recruiter_1.RecruiterPermissions,
};
var Permission;
(function (Permission) {
    Permission["AnnouncementsCategoryRead"] = "announcements.category.read";
    Permission["AnnouncementsComment"] = "announcements.comment";
    Permission["AnnouncementsManage"] = "announcements.manage";
    Permission["AnnouncementsReact"] = "announcements.react";
    Permission["AnnouncementsRead"] = "announcements.read";
    Permission["AssetsManage"] = "assets.manage";
    Permission["AssetsRead"] = "assets.read";
    Permission["AssetsReportManage"] = "assets.report.manage";
    Permission["AssetsReportRead"] = "assets.report.read";
    Permission["AssetsRequestManage"] = "assets.request.manage";
    Permission["AssetsRequestRead"] = "assets.request.read";
    Permission["AttendanceClockIn"] = "attendance.clockin";
    Permission["AttendanceClockOut"] = "attendance.clockout";
    Permission["AttendanceManage"] = "attendance.manage";
    Permission["AttendanceRead"] = "attendance.read";
    Permission["AttendanceSettings"] = "attendance.settings";
    Permission["AuditAuthRead"] = "audit.auth.read";
    Permission["AuditLogsRead"] = "audit.logs.read";
    Permission["BenefitGroupsManage"] = "benefit_groups.manage";
    Permission["BenefitGroupsRead"] = "benefit_groups.read";
    Permission["BenefitPlansManage"] = "benefit_plans.manage";
    Permission["BenefitsEnroll"] = "benefits.enroll";
    Permission["BenefitsRead"] = "benefits.read";
    Permission["CompanyElements"] = "company.elements";
    Permission["CompanyManage"] = "company.manage";
    Permission["CompanyRead"] = "company.read";
    Permission["CompanySummary"] = "company.summary";
    Permission["CompanyTaxManage"] = "company_tax.manage";
    Permission["CompanyTaxRead"] = "company_tax.read";
    Permission["CostCenterManage"] = "cost_center.manage";
    Permission["CostCenterRead"] = "cost_center.read";
    Permission["DepartmentHierarchy"] = "department.hierarchy";
    Permission["DepartmentManage"] = "department.manage";
    Permission["DepartmentRead"] = "department.read";
    Permission["LocationsManage"] = "locations.manage";
    Permission["LocationsManagers"] = "locations.managers";
    Permission["LocationsRead"] = "locations.read";
    Permission["OrgChartRead"] = "org_chart.read";
    Permission["EmployeesAssignManager"] = "employees.assign_manager";
    Permission["EmployeesBulkCreate"] = "employees.bulk_create";
    Permission["EmployeesDownloadTemplate"] = "employees.download_template";
    Permission["EmployeesFallbackManagers"] = "employees.fallback_managers";
    Permission["EmployeesGenerateId"] = "employees.generate_id";
    Permission["EmployeesManage"] = "employees.manage";
    Permission["EmployeesReadAll"] = "employees.read_all";
    Permission["EmployeesReadFull"] = "employees.read_full";
    Permission["EmployeesReadOne"] = "employees.read_one";
    Permission["EmployeesReadSelf"] = "employees.read_self";
    Permission["EmployeesSearch"] = "employees.search";
    Permission["EmployeeShiftsAssign"] = "employee_shifts.assign";
    Permission["EmployeeShiftsManage"] = "employee_shifts.manage";
    Permission["EmployeeShiftsRead"] = "employee_shifts.read";
    Permission["ShiftsManage"] = "shifts.manage";
    Permission["ShiftsRead"] = "shifts.read";
    Permission["ExpensesBulkUpload"] = "expenses.bulk_upload";
    Permission["ExpensesManage"] = "expenses.manage";
    Permission["ExpensesRead"] = "expenses.read";
    Permission["ExpensesSettings"] = "expenses.settings";
    Permission["HolidaysManage"] = "holidays.manage";
    Permission["HolidaysRead"] = "holidays.read";
    Permission["HolidaysSeed"] = "holidays.seed";
    Permission["ReservedDaysManage"] = "reserved_days.manage";
    Permission["ReservedDaysRead"] = "reserved_days.read";
    Permission["JobRolesManage"] = "job_roles.manage";
    Permission["JobRolesRead"] = "job_roles.read";
    Permission["LeaveBalanceAccrual"] = "leave.balance.accrual";
    Permission["LeaveBalanceRead"] = "leave.balance.read";
    Permission["LeaveBlockedDaysManage"] = "leave.blocked_days.manage";
    Permission["LeaveBlockedDaysRead"] = "leave.blocked_days.read";
    Permission["LeavePolicyManage"] = "leave.policy.manage";
    Permission["LeavePolicyRead"] = "leave.policy.read";
    Permission["LeaveReports"] = "leave.reports";
    Permission["LeaveRequestCreate"] = "leave.request.create";
    Permission["LeaveRequestReadAll"] = "leave.request.read_all";
    Permission["LeaveRequestReadEmployee"] = "leave.request.read_employee";
    Permission["LeaveSettings"] = "leave.settings";
    Permission["LeaveTypesManage"] = "leave.types.manage";
    Permission["LeaveTypesRead"] = "leave.types.read";
    Permission["LeaveApprovalManage"] = "leave_approval.manage";
    Permission["PayrollAdjustmentsManage"] = "payroll.adjustments.manage";
    Permission["PayrollAdjustmentsRead"] = "payroll.adjustments.read";
    Permission["PayrollOverridesManage"] = "payroll.overrides.manage";
    Permission["PayrollOverridesRead"] = "payroll.overrides.read";
    Permission["PayrollAllowancesManage"] = "payroll.allowances.manage";
    Permission["PayrollAllowancesRead"] = "payroll.allowances.read";
    Permission["PayrollBonusesManage"] = "payroll.bonuses.manage";
    Permission["PayrollBonusesRead"] = "payroll.bonuses.read";
    Permission["PayrollDeductionsEmployeeManage"] = "payroll.deductions.employee.manage";
    Permission["PayrollDeductionsEmployeeRead"] = "payroll.deductions.employee.read";
    Permission["PayrollDeductionsTypesManage"] = "payroll.deductions.types.manage";
    Permission["PayrollDeductionsTypesRead"] = "payroll.deductions.types.read";
    Permission["PayrollOffCycleManage"] = "payroll.off_cycle.manage";
    Permission["PayrollOffCycleRead"] = "payroll.off_cycle.read";
    Permission["PayrollPayGroupsManage"] = "payroll.pay_groups.manage";
    Permission["PayrollPayGroupsRead"] = "payroll.pay_groups.read";
    Permission["PayrollPaySchedulesManage"] = "payroll.pay_schedules.manage";
    Permission["PayrollPaySchedulesRead"] = "payroll.pay_schedules.read";
    Permission["PayrollPayslipsReadAll"] = "payroll.payslips.read_all";
    Permission["PayrollPayslipsReadSelf"] = "payroll.payslips.read_self";
    Permission["PayrollReportsRead"] = "payroll.reports.read";
    Permission["PayrollRunApprovalStatus"] = "payroll.run.approval_status";
    Permission["PayrollRunApprove"] = "payroll.run.approve";
    Permission["PayrollRunCalculate"] = "payroll.run.calculate";
    Permission["PayrollRunMarkInProgress"] = "payroll.run.mark_in_progress";
    Permission["PayrollRunRead"] = "payroll.run.read";
    Permission["PayrollRunSendForApproval"] = "payroll.run.send_for_approval";
    Permission["PayrollRunUpdatePaymentStatus"] = "payroll.run.update_payment_status";
    Permission["PayrollSettingsManage"] = "payroll_settings.manage";
    Permission["PayrollSettingsRead"] = "payroll_settings.read";
    Permission["PermissionsManage"] = "permissions.manage";
    Permission["PermissionsRead"] = "permissions.read";
    Permission["RolesManage"] = "roles.manage";
    Permission["RolesRead"] = "roles.read";
    Permission["SalaryAdvanceHistory"] = "salary_advance.history";
    Permission["SalaryAdvanceHistoryEmployee"] = "salary_advance.history_employee";
    Permission["SalaryAdvanceManage"] = "salary_advance.manage";
    Permission["SalaryAdvanceReadAll"] = "salary_advance.read_all";
    Permission["SalaryAdvanceReadEmployee"] = "salary_advance.read_employee";
    Permission["SalaryAdvanceReadOne"] = "salary_advance.read_one";
    Permission["SalaryAdvanceRepay"] = "salary_advance.repay";
    Permission["SalaryAdvanceRequest"] = "salary_advance.request";
    Permission["TaxDownload"] = "tax.download";
    Permission["TaxManage"] = "tax.manage";
    Permission["TaxRead"] = "tax.read";
})(Permission || (exports.Permission = Permission = {}));
//# sourceMappingURL=permission-keys.js.map