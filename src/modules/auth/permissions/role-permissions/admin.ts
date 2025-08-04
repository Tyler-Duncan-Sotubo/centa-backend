import { AnnouncementPermissions } from '../permission-keys/announcements';
import { AssetPermissions } from '../permission-keys/assets';
import { AttendancePermissions } from '../permission-keys/attendance';
import { AuditPermissions } from '../permission-keys/audit';
import { BenefitPermissions } from '../permission-keys/benefits';
import { CompanyPermissions } from '../permission-keys/company';
import { DepartmentPermissions } from '../permission-keys/departments';
import { EmployeePermissions } from '../permission-keys/employees';
import { ExpensePermissions } from '../permission-keys/expenses';
import { JobRolePermissions } from '../permission-keys/job_roles';
import { LeavePermissions } from '../permission-keys/leave';
import { LocationPermissions } from '../permission-keys/locations';
import { OrgChartPermissions } from '../permission-keys/org_chart';
import { PayrollPermissions } from '../permission-keys/payroll';
import { PermissionManagementPermissions } from '../permission-keys/permission_management';
import { RecruitPermissions } from '../permission-keys/recruit';
import { SalaryAdvancePermissions } from '../permission-keys/salary_advance';
import { ShiftPermissions } from '../permission-keys/shifts';
import { TaxPermissions } from '../permission-keys/tax';
import { PerformancePermissions } from '../permission-keys/performance';

export const AdminPermissions = [
  ...PerformancePermissions,
  ...RecruitPermissions,
  ...AnnouncementPermissions,
  ...AssetPermissions,
  ...AuditPermissions,
  ...BenefitPermissions,
  ...AttendancePermissions,
  ...ShiftPermissions,
  ...ExpensePermissions,
  ...LeavePermissions,
  ...CompanyPermissions,
  ...LocationPermissions,
  ...DepartmentPermissions,
  ...OrgChartPermissions,
  ...JobRolePermissions,
  ...EmployeePermissions,
  ...PayrollPermissions,
  ...SalaryAdvancePermissions,
  ...TaxPermissions,
  ...PermissionManagementPermissions,
];
