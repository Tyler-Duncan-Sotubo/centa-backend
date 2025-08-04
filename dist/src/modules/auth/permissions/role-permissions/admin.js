"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermissions = void 0;
const announcements_1 = require("../permission-keys/announcements");
const assets_1 = require("../permission-keys/assets");
const attendance_1 = require("../permission-keys/attendance");
const audit_1 = require("../permission-keys/audit");
const benefits_1 = require("../permission-keys/benefits");
const company_1 = require("../permission-keys/company");
const departments_1 = require("../permission-keys/departments");
const employees_1 = require("../permission-keys/employees");
const expenses_1 = require("../permission-keys/expenses");
const job_roles_1 = require("../permission-keys/job_roles");
const leave_1 = require("../permission-keys/leave");
const locations_1 = require("../permission-keys/locations");
const org_chart_1 = require("../permission-keys/org_chart");
const payroll_1 = require("../permission-keys/payroll");
const permission_management_1 = require("../permission-keys/permission_management");
const recruit_1 = require("../permission-keys/recruit");
const salary_advance_1 = require("../permission-keys/salary_advance");
const shifts_1 = require("../permission-keys/shifts");
const tax_1 = require("../permission-keys/tax");
const performance_1 = require("../permission-keys/performance");
exports.AdminPermissions = [
    ...performance_1.PerformancePermissions,
    ...recruit_1.RecruitPermissions,
    ...announcements_1.AnnouncementPermissions,
    ...assets_1.AssetPermissions,
    ...audit_1.AuditPermissions,
    ...benefits_1.BenefitPermissions,
    ...attendance_1.AttendancePermissions,
    ...shifts_1.ShiftPermissions,
    ...expenses_1.ExpensePermissions,
    ...leave_1.LeavePermissions,
    ...company_1.CompanyPermissions,
    ...locations_1.LocationPermissions,
    ...departments_1.DepartmentPermissions,
    ...org_chart_1.OrgChartPermissions,
    ...job_roles_1.JobRolePermissions,
    ...employees_1.EmployeePermissions,
    ...payroll_1.PayrollPermissions,
    ...salary_advance_1.SalaryAdvancePermissions,
    ...tax_1.TaxPermissions,
    ...permission_management_1.PermissionManagementPermissions,
];
//# sourceMappingURL=admin.js.map