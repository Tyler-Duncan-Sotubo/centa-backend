"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateReportService = void 0;
const common_1 = require("@nestjs/common");
const export_util_1 = require("../../../utils/export.util");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
const report_service_1 = require("./report.service");
const crypto_util_1 = require("../../../utils/crypto.util");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const payroll_ytd_schema_1 = require("../schema/payroll-ytd.schema");
const export_matrix_to_csv_1 = require("../../../utils/export-matrix-to-csv");
const decimal_js_1 = require("decimal.js");
const deduction_schema_1 = require("../schema/deduction.schema");
const payroll_allowances_schema_1 = require("../schema/payroll-allowances.schema");
const slugify_1 = require("../../../utils/slugify");
let GenerateReportService = class GenerateReportService {
    constructor(db, payrollService, awsService) {
        this.db = db;
        this.payrollService = payrollService;
        this.awsService = awsService;
        this.format = (val) => new decimal_js_1.default(val).toNumber().toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    formatNumber(value) {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num))
            return '0.00';
        return num.toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    todayString() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    async exportAndUpload(rows, columns, filenameBase, companyId, folder) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = await export_util_1.ExportUtil.exportToCSV(rows, columns, filenameBase);
        return this.awsService.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async exportAndUploadExcel(rows, columns, filenameBase, companyId, folder) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = await export_util_1.ExportUtil.exportToExcel(rows, columns, filenameBase);
        return this.awsService.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async exportAndUploadMatrix(rows, columns, filenameBase, companyId, folder) {
        if (!rows || rows.length === 0) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = export_matrix_to_csv_1.ExportMatrixUtil.exportMatrixToCSV(rows, columns.map((col) => ({ field: col.field, title: col.title })), filenameBase);
        return this.awsService.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async downloadPayslipsToS3(companyId, payrollRunId, format) {
        const payslips = await this.db
            .selectDistinctOn([schema_1.employees.employeeNumber], {
            employee_number: schema_1.employees.employeeNumber,
            first_name: schema_1.employees.firstName,
            last_name: schema_1.employees.lastName,
            email: schema_1.employees.email,
            issued_at: payroll_run_schema_1.payroll.createdAt,
            gross_salary: (0, drizzle_orm_1.sql) `payroll.gross_salary`,
            net_salary: (0, drizzle_orm_1.sql) `payroll.net_salary`,
            paye_tax: (0, drizzle_orm_1.sql) `payroll.paye_tax`,
            pension_contribution: (0, drizzle_orm_1.sql) `payroll.pension_contribution`,
            employer_pension_contribution: (0, drizzle_orm_1.sql) `payroll.employer_pension_contribution`,
            nhf_contribution: (0, drizzle_orm_1.sql) `payroll.nhf_contribution`,
            payroll_month: payroll_run_schema_1.payroll.payrollMonth,
            bank_name: schema_1.employeeFinancials.bankName,
            bank_account_number: schema_1.employeeFinancials.bankAccountNumber,
            payroll_id: payroll_run_schema_1.payroll.id,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
            expenses: payroll_run_schema_1.payroll.reimbursements,
            companyName: schema_1.companies.name,
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, schema_1.companies.id))
            .leftJoin(schema_1.employeeFinancials, (0, drizzle_orm_1.eq)(schema_1.employees.id, schema_1.employeeFinancials.employeeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payrollRunId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.employees.employeeNumber))
            .execute();
        if (!payslips || payslips.length === 0) {
            return null;
        }
        const types = await this.db
            .select({
            id: deduction_schema_1.deductionTypes.id,
            name: deduction_schema_1.deductionTypes.name,
        })
            .from(deduction_schema_1.deductionTypes)
            .execute();
        const typeMap = new Map(types.map((t) => [t.id, t.name]));
        const allTypes = new Set();
        for (const p of payslips) {
            const voluntaryDeductions = Array.isArray(p.voluntaryDeductions)
                ? p.voluntaryDeductions
                : [];
            for (const d of voluntaryDeductions) {
                const name = typeMap.get(d.typeId) || d.typeId;
                allTypes.add(name);
            }
        }
        const voluntaryColumns = Array.from(allTypes).map((name) => ({
            field: name,
            title: `${name} (₦)`,
        }));
        const expenseColumns = [];
        for (const p of payslips) {
            const expenses = Array.isArray(p.expenses) ? p.expenses : [];
            for (const expense of expenses) {
                if (!expenseColumns.some((col) => col.field === expense.expenseName)) {
                    expenseColumns.push({
                        field: expense.expenseName,
                        title: `Reimbursement ${expense.expenseName} (₦)`,
                    });
                }
            }
        }
        let columns;
        if (format === 'bank') {
            columns = [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'bank_name', title: 'Bank Name' },
                { field: 'bank_account_number', title: 'Bank Account Number' },
                { field: 'net_salary', title: 'Net Salary (₦)' },
            ];
        }
        else if (format === 'nhf') {
            columns = [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'nhf_contribution', title: 'NHF Contribution (₦)' },
                { field: 'payroll_month', title: 'Payroll Month' },
            ];
        }
        else if (format === 'pension') {
            columns = [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'pension_contribution', title: 'Employee Pension (₦)' },
                {
                    field: 'employer_pension_contribution',
                    title: 'Employer Pension (₦)',
                },
                { field: 'payroll_month', title: 'Payroll Month' },
            ];
        }
        else if (format === 'paye') {
            columns = [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'paye_tax', title: 'PAYE Tax (₦)' },
                { field: 'payroll_month', title: 'Payroll Month' },
            ];
        }
        else {
            columns = [
                { field: 'employee_number', title: 'Employee Number' },
                { field: 'first_name', title: 'First Name' },
                { field: 'last_name', title: 'Last Name' },
                { field: 'email', title: 'Email' },
                { field: 'gross_salary', title: 'Gross Salary (₦)' },
                { field: 'paye_tax', title: 'PAYE Tax (₦)' },
                { field: 'nhf_contribution', title: 'NHF Contribution (₦)' },
                { field: 'pension_contribution', title: 'Employee Pension (₦)' },
                ...voluntaryColumns,
                ...expenseColumns,
                { field: 'net_salary', title: 'Net Salary (₦)' },
                {
                    field: 'employer_pension_contribution',
                    title: 'Employer Pension (₦)',
                },
                { field: 'payroll_month', title: 'Payroll Month' },
                { field: 'issued_at', title: 'Issued Date' },
            ];
        }
        const companyName = payslips[0]?.companyName || 'unknown-company';
        const companySlug = (0, slugify_1.slugify)(companyName);
        const filename = `${companySlug}-${format}-${payslips[0].payroll_month}`;
        const keys = columns.map((col) => ({
            field: col.field,
            title: col.title,
        }));
        const decryptedPayslips = payslips.map((p) => {
            const voluntary = {};
            const voluntaryDeductions = Array.isArray(p.voluntaryDeductions)
                ? p.voluntaryDeductions
                : [];
            for (const d of voluntaryDeductions) {
                const name = typeMap.get(d.typeId) || d.typeId;
                voluntary[name] = this.format(d.amount);
            }
            const expenses = {};
            const expenseData = Array.isArray(p.expenses) ? p.expenses : [];
            for (const expense of expenseData) {
                expenses[expense.expenseName] = this.format(expense.amount);
            }
            return {
                ...p,
                bank_name: p.bank_name ? (0, crypto_util_1.decrypt)(p.bank_name) : '',
                bank_account_number: p.bank_account_number
                    ? (0, crypto_util_1.decrypt)(p.bank_account_number)
                    : '',
                gross_salary: this.format(p.gross_salary),
                net_salary: this.format(p.net_salary),
                paye_tax: this.format(p.paye_tax),
                pension_contribution: this.format(p.pension_contribution),
                employer_pension_contribution: this.format(p.employer_pension_contribution),
                nhf_contribution: this.format(p.nhf_contribution),
                ...voluntary,
                ...expenses,
            };
        });
        return this.exportAndUpload(decryptedPayslips, keys, filename, companyId, 'payroll-payslips');
    }
    async downloadYtdPayslipsToS3(companyId, format = 'csv') {
        const ytdData = await this.db
            .select({
            employeeId: payroll_ytd_schema_1.payrollYtd.employeeId,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            employeeNumber: schema_1.employees.employeeNumber,
            gross_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary}) `,
            net_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary}) `,
            paye_tax_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.PAYE}) `,
            pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.pension}) `,
            employer_pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.employerPension}) `,
            nhf_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.nhf}) `,
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId))
            .groupBy(payroll_ytd_schema_1.payrollYtd.employeeId, schema_1.employees.firstName, schema_1.employees.lastName, schema_1.employees.employeeNumber)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.employees.employeeNumber))
            .execute();
        if (!ytdData.length) {
            throw new common_1.BadRequestException('No YTD data found');
        }
        const filename = `ytd_summary_${companyId}_${new Date().toISOString().slice(0, 10)}`;
        const columns = [
            { field: 'employeeNumber', title: 'Employee Number' },
            { field: 'firstName', title: 'First Name' },
            { field: 'lastName', title: 'Last Name' },
            { field: 'gross_salary_ytd', title: 'YTD Gross Salary (₦)' },
            { field: 'net_salary_ytd', title: 'YTD Net Salary (₦)' },
            { field: 'paye_tax_ytd', title: 'YTD PAYE Tax (₦)' },
            { field: 'pension_contribution_ytd', title: 'YTD Employee Pension (₦)' },
            {
                field: 'employer_pension_contribution_ytd',
                title: 'YTD Employer Pension (₦)',
            },
            { field: 'nhf_contribution_ytd', title: 'YTD NHF (₦)' },
        ];
        if (format === 'csv') {
            return this.exportAndUpload(ytdData, columns, filename, companyId, 'ytd');
        }
        else {
            return this.exportAndUploadExcel(ytdData, columns, filename, companyId, 'ytd');
        }
    }
    async generateCompanyVarianceMatrix(companyId) {
        const result = await this.payrollService.getEmployeePayrollVariance(companyId);
        if (!result || !('varianceList' in result)) {
            return {
                rows: [],
                columns: [],
                payrollDate: null,
                previousPayrollDate: null,
                empty: true,
            };
        }
        const { payrollDate, previousPayrollDate, varianceList } = result;
        const total = {
            grossSalary: new decimal_js_1.default(0),
            netSalary: new decimal_js_1.default(0),
            paye: new decimal_js_1.default(0),
            pension: new decimal_js_1.default(0),
            nhf: new decimal_js_1.default(0),
            employerPension: new decimal_js_1.default(0),
            previous: {
                grossSalary: new decimal_js_1.default(0),
                netSalary: new decimal_js_1.default(0),
                paye: new decimal_js_1.default(0),
                pension: new decimal_js_1.default(0),
                nhf: new decimal_js_1.default(0),
                employerPension: new decimal_js_1.default(0),
            },
        };
        for (const v of varianceList) {
            total.previous.grossSalary = total.previous.grossSalary.plus(v.previous.grossSalary || 0);
            total.previous.netSalary = total.previous.netSalary.plus(v.previous.netSalary || 0);
            total.previous.paye = total.previous.paye.plus(v.previous.paye || 0);
            total.previous.pension = total.previous.pension.plus(v.previous.pension || 0);
            total.previous.nhf = total.previous.nhf.plus(v.previous.nhf || 0);
            total.previous.employerPension = total.previous.employerPension.plus(v.previous.employerPension || 0);
            total.grossSalary = total.grossSalary.plus(v.current.grossSalary || 0);
            total.netSalary = total.netSalary.plus(v.current.netSalary || 0);
            total.paye = total.paye.plus(v.current.paye || 0);
            total.pension = total.pension.plus(v.current.pension || 0);
            total.nhf = total.nhf.plus(v.current.nhf || 0);
            total.employerPension = total.employerPension.plus(v.current.employerPension || 0);
        }
        const rows = [
            {
                metric: 'Gross Salary (₦)',
                [previousPayrollDate]: this.format(total.previous.grossSalary),
                [payrollDate]: this.format(total.grossSalary),
                variance: this.format(total.grossSalary.minus(total.previous.grossSalary)),
            },
            {
                metric: 'Net Salary (₦)',
                [previousPayrollDate]: this.format(total.previous.netSalary),
                [payrollDate]: this.format(total.netSalary),
                variance: this.format(total.netSalary.minus(total.previous.netSalary)),
            },
            {
                metric: 'PAYE (₦)',
                [previousPayrollDate]: this.format(total.previous.paye),
                [payrollDate]: this.format(total.paye),
                variance: this.format(total.paye.minus(total.previous.paye)),
            },
            {
                metric: 'Pension (Employee) (₦)',
                [previousPayrollDate]: this.format(total.previous.pension),
                [payrollDate]: this.format(total.pension),
                variance: this.format(total.pension.minus(total.previous.pension)),
            },
            {
                metric: 'NHF Contribution (₦)',
                [previousPayrollDate]: this.format(total.previous.nhf),
                [payrollDate]: this.format(total.nhf),
                variance: this.format(total.nhf.minus(total.previous.nhf)),
            },
            {
                metric: 'Pension (Employer) (₦)',
                [previousPayrollDate]: this.format(total.previous.employerPension),
                [payrollDate]: this.format(total.employerPension),
                variance: this.format(total.employerPension.minus(total.previous.employerPension)),
            },
        ];
        const columns = [
            { field: 'metric', title: 'Metric' },
            {
                field: previousPayrollDate,
                title: `Previous (${previousPayrollDate})`,
            },
            { field: payrollDate, title: `Current (${payrollDate})` },
            { field: 'variance', title: 'Variance (₦)' },
        ];
        return {
            payrollDate,
            previousPayrollDate,
            rows,
            columns,
        };
    }
    async generateEmployeeVarianceMatrix(companyId) {
        const result = await this.payrollService.getEmployeePayrollVariance(companyId);
        if (!result || !('varianceList' in result)) {
            return {
                rows: [],
                columns: [],
                payrollDate: null,
                previousPayrollDate: null,
                empty: true,
            };
        }
        const { payrollDate, previousPayrollDate, varianceList } = result;
        const rows = [];
        for (const v of varianceList) {
            const name = v.fullName;
            rows.push({
                employee: name,
                metric: 'Gross Salary (₦)',
                [previousPayrollDate]: this.format(v.previous.grossSalary),
                [payrollDate]: this.format(v.current.grossSalary),
                variance: this.format(v.variance.grossSalaryDiff),
            }, {
                employee: name,
                metric: 'Net Salary (₦)',
                [previousPayrollDate]: this.format(v.previous.netSalary),
                [payrollDate]: this.format(v.current.netSalary),
                variance: this.format(v.variance.netSalaryDiff),
            }, {
                employee: name,
                metric: 'PAYE (₦)',
                [previousPayrollDate]: this.format(v.previous.paye),
                [payrollDate]: this.format(v.current.paye),
                variance: this.format(v.variance.payeDiff),
            }, {
                employee: name,
                metric: 'Pension (₦)',
                [previousPayrollDate]: this.format(v.previous.pension),
                [payrollDate]: this.format(v.current.pension),
                variance: this.format(v.variance.pensionDiff),
            }, {
                employee: name,
                metric: 'Employer Pension (₦)',
                [previousPayrollDate]: this.format(v.previous.employerPension),
                [payrollDate]: this.format(v.current.employerPension),
                variance: this.format(v.variance.employerPensionDiff),
            }, {
                employee: name,
                metric: 'NHF (₦)',
                [previousPayrollDate]: this.format(v.previous.nhf),
                [payrollDate]: this.format(v.current.nhf ?? 0),
                variance: this.format(v.variance.nhfDiff),
            });
        }
        const columns = [
            { field: 'employee', title: 'Employee' },
            { field: 'metric', title: 'Metric' },
            {
                field: previousPayrollDate,
                title: `Previous (${previousPayrollDate})`,
            },
            { field: payrollDate, title: `Current (${payrollDate})` },
            { field: 'variance', title: 'Variance (₦)' },
        ];
        return {
            payrollDate,
            previousPayrollDate,
            rows,
            columns,
        };
    }
    async getPayrollVarianceMatrices(companyId) {
        const [companyMatrix, employeeMatrix] = await Promise.all([
            this.generateCompanyVarianceMatrix(companyId),
            this.generateEmployeeVarianceMatrix(companyId),
        ]);
        return {
            company: companyMatrix,
            employees: employeeMatrix,
        };
    }
    async generateCompanyPayrollVarianceReportToS3(companyId) {
        const { rows, columns, payrollDate } = await this.generateCompanyVarianceMatrix(companyId);
        const filename = `payroll_summary_matrix_${companyId}_${payrollDate}`;
        return this.exportAndUploadMatrix(rows, columns, filename, companyId, 'payroll-summary-matrix');
    }
    async generateEmployeeMatrixVarianceReportToS3(companyId) {
        const result = await this.payrollService.getEmployeePayrollVariance(companyId);
        if (!result || !('varianceList' in result)) {
            throw new Error('No payroll variance data available.');
        }
        const { payrollDate, previousPayrollDate, varianceList } = result;
        const rows = [];
        for (const v of varianceList) {
            const name = v.fullName;
            rows.push({
                employee: name,
                metric: 'Gross Salary (₦)',
                [previousPayrollDate]: this.format(v.previous.grossSalary),
                [payrollDate]: this.format(v.current.grossSalary),
                variance: this.format(v.variance.grossSalaryDiff),
            }, {
                employee: name,
                metric: 'Net Salary (₦)',
                [previousPayrollDate]: this.format(v.previous.netSalary),
                [payrollDate]: this.format(v.current.netSalary),
                variance: this.format(v.variance.netSalaryDiff),
            }, {
                employee: name,
                metric: 'PAYE (₦)',
                [previousPayrollDate]: this.format(v.previous.paye),
                [payrollDate]: this.format(v.current.paye),
                variance: this.format(v.variance.payeDiff),
            }, {
                employee: name,
                metric: 'Pension (₦)',
                [previousPayrollDate]: this.format(v.previous.pension),
                [payrollDate]: this.format(v.current.pension),
                variance: this.format(v.variance.pensionDiff),
            }, {
                employee: name,
                metric: 'Employer Pension (₦)',
                [previousPayrollDate]: this.format(v.previous.employerPension),
                [payrollDate]: this.format(v.current.employerPension),
                variance: this.format(v.variance.employerPensionDiff),
            }, {
                employee: name,
                metric: 'NHF (₦)',
                [previousPayrollDate]: this.format(v.previous.nhf),
                [payrollDate]: this.format(v.current.nhf ?? 0),
                variance: this.format(v.variance.nhfDiff),
            });
        }
        const filename = `employee_variance_matrix_${companyId}_${payrollDate}`;
        const columns = [
            { field: 'employee', title: 'Employee' },
            { field: 'metric', title: 'Metric' },
            {
                field: previousPayrollDate,
                title: `Previous (${previousPayrollDate})`,
            },
            { field: payrollDate, title: `Current (${payrollDate})` },
            { field: 'variance', title: 'Variance (₦)' },
        ];
        return this.exportAndUploadMatrix(rows, columns, filename, companyId, 'payroll-employee-matrix');
    }
    async generatePayrollDashboardReportToS3(companyId) {
        const dashboard = await this.payrollService.getPayrollDashboard(companyId);
        const rows = dashboard.runSummaries.map((r) => ({
            payrollRunId: r.payrollRunId,
            payrollDate: r.payrollDate,
            payrollMonth: r.payrollMonth,
            approvalStatus: r.approvalStatus,
            paymentStatus: r.paymentStatus,
            totalGross: r.totalGross,
            totalDeductions: r.totalDeductions,
            totalBonuses: r.totalBonuses,
            totalNet: r.totalNet,
            employeeCount: r.employeeCount,
            costPerRun: r.costPerRun,
        }));
        const filename = `payroll_dashboard_${companyId}_${this.todayString()}`;
        const columns = [
            { field: 'payrollRunId', title: 'Payroll Run ID' },
            { field: 'payrollDate', title: 'Payroll Date' },
            { field: 'payrollMonth', title: 'Payroll Month' },
            { field: 'approvalStatus', title: 'Approval Status' },
            { field: 'paymentStatus', title: 'Payment Status' },
            { field: 'totalGross', title: 'Total Gross (₦)' },
            { field: 'totalDeductions', title: 'Total Deductions (₦)' },
            { field: 'totalBonuses', title: 'Total Bonuses (₦)' },
            { field: 'totalNet', title: 'Total Net Pay (₦)' },
            { field: 'employeeCount', title: 'Employee Count' },
            { field: 'costPerRun', title: 'Cost Per Run (₦)' },
        ];
        return this.exportAndUpload(rows, columns, filename, companyId, 'payroll-dashboard');
    }
    async generateRunSummariesReportToS3(companyId, month) {
        const runs = await this.payrollService.getPayrollDashboard(companyId, month);
        const runSummaries = runs.runSummaries;
        const rows = runSummaries.map((r) => ({
            payrollRunId: r.payrollRunId,
            payrollDate: r.payrollDate,
            payrollMonth: r.payrollMonth,
            approvalStatus: r.approvalStatus,
            paymentStatus: r.paymentStatus,
            totalGross: r.totalGross,
            totalDeductions: r.totalDeductions,
            totalBonuses: r.totalBonuses,
            totalNet: r.totalNet,
            employeeCount: r.employeeCount,
            costPerRun: r.costPerRun,
        }));
        const m = month ?? new Date().toISOString().slice(0, 7);
        const filename = `run_summaries_${companyId}_${m}`;
        const columns = [
            { field: 'payrollRunId', title: 'Payroll Run ID' },
            { field: 'payrollDate', title: 'Payroll Date' },
            { field: 'payrollMonth', title: 'Payroll Month' },
            { field: 'approvalStatus', title: 'Approval Status' },
            { field: 'paymentStatus', title: 'Payment Status' },
            { field: 'totalGross', title: 'Total Gross (₦)' },
            { field: 'totalDeductions', title: 'Total Deductions (₦)' },
            { field: 'totalBonuses', title: 'Total Bonuses (₦)' },
            { field: 'totalNet', title: 'Total Net Pay (₦)' },
            { field: 'employeeCount', title: 'Employee Count' },
            { field: 'costPerRun', title: 'Cost Per Run (₦)' },
        ];
        return this.exportAndUpload(rows, columns, filename, companyId, 'runs');
    }
    async generateCostByPayGroupReportToS3(companyId, month) {
        const data = await this.payrollService.getCostByPayGroup(companyId, month);
        const rows = data.map((r) => ({
            payGroupId: r.payGroupId,
            payGroupName: r.payGroupName,
            totalGross: r.totalGross,
            totalNet: r.totalNet,
            headcount: r.headcount,
        }));
        const filename = `cost_by_paygroup_${companyId}_${month}`;
        const columns = [
            { field: 'payGroupId', title: 'Pay Group ID' },
            { field: 'payGroupName', title: 'Pay Group Name' },
            { field: 'totalGross', title: 'Total Gross (₦)' },
            { field: 'totalNet', title: 'Total Net (₦)' },
            { field: 'headcount', title: 'Employee Count' },
        ];
        return this.exportAndUpload(rows, columns, filename, companyId, 'cost-by-paygroup');
    }
    async generateCostByDepartmentReportToS3(companyId, month, format = 'csv') {
        const data = await this.payrollService.getCostByDepartment(companyId, month);
        const rows = data.map((r) => ({
            departmentName: r.departmentName,
            totalGross: r.totalGross,
            totalNet: r.totalNet,
            headcount: r.headcount,
        }));
        const filename = `cost_by_department_${companyId}_${month}`;
        const columns = [
            { field: 'departmentName', title: 'Department Name' },
            { field: 'totalGross', title: 'Total Gross (₦)' },
            { field: 'totalNet', title: 'Total Net (₦)' },
            { field: 'headcount', title: 'Headcount' },
        ];
        if (format === 'excel') {
            return this.exportAndUploadExcel(rows, columns, filename, companyId, 'cost-by-department');
        }
        else {
            return this.exportAndUpload(rows, columns, filename, companyId, 'cost-by-department');
        }
    }
    async generateDeductionsByEmployeeReportToS3(companyId, month, format = 'csv') {
        const data = await this.payrollService.getDeductionsByEmployee(companyId, month);
        const rows = data.map((r) => ({
            employeeName: r.employeeName,
            paye: this.formatNumber(r.paye),
            pension: this.formatNumber(r.pension),
            nhf: this.formatNumber(r.nhf ?? 0),
            salaryAdvance: this.formatNumber(r.salaryAdvance ?? 0),
            voluntary: this.formatNumber(r.voluntary),
            total: this.formatNumber(r.total),
        }));
        const filename = `deductions_by_employee_${companyId}_${month}`;
        const columns = [
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'paye', title: 'PAYE' },
            { field: 'pension', title: 'Pension' },
            { field: 'nhf', title: 'NHF' },
            { field: 'salaryAdvance', title: 'Salary Advance' },
            { field: 'voluntary', title: 'Voluntary' },
            { field: 'total', title: 'Total Deductions' },
        ];
        if (format === 'excel') {
            return this.exportAndUploadExcel(rows, columns, filename, companyId, 'deductions-by-employee');
        }
        else {
            return this.exportAndUpload(rows, columns, filename, companyId, 'deductions-by-employee');
        }
    }
    async generateTopBonusRecipientsReportToS3(companyId, month, limit = 10) {
        const data = await this.payrollService.getTopBonusRecipients(companyId, month, limit);
        const rows = data.map((r) => ({
            employeeId: r.employeeId,
            fullName: r.fullName,
            bonus: r.bonus,
        }));
        const filename = `top_bonus_${companyId}_${month}`;
        const columns = [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'fullName', title: 'Full Name' },
            { field: 'bonus', title: 'Bonus (₦)' },
        ];
        return this.exportAndUpload(rows, columns, filename, companyId, 'bonus-recipients');
    }
    async generateLoanSummaryReportToS3(companyId) {
        const { outstandingSummary, monthlySummary } = await this.payrollService.getLoanFullReport(companyId);
        const outstandingRows = outstandingSummary.map((item) => ({
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            totalLoanAmount: item.totalLoanAmount,
            totalRepaid: item.totalRepaid,
            outstanding: item.outstanding,
            status: item.status,
        }));
        const outstandingColumns = [
            { field: 'employeeId', title: 'Employee ID' },
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'totalLoanAmount', title: 'Total Loan Amount' },
            { field: 'totalRepaid', title: 'Total Repaid' },
            { field: 'outstanding', title: 'Outstanding Balance' },
            { field: 'status', title: 'Status' },
        ];
        const monthlyRows = monthlySummary.map((item) => ({
            year: item.year,
            month: item.month,
            status: item.status,
            totalLoanAmount: item.totalLoanAmount,
            totalRepaid: item.totalRepaid,
            totalOutstanding: item.totalOutstanding,
        }));
        const monthlyColumns = [
            { field: 'year', title: 'Year' },
            { field: 'month', title: 'Month' },
            { field: 'status', title: 'Status' },
            { field: 'totalLoanAmount', title: 'Total Loan Amount' },
            { field: 'totalRepaid', title: 'Total Repaid' },
            { field: 'totalOutstanding', title: 'Total Outstanding' },
        ];
        const filePath = await export_util_1.ExportUtil.exportToExcelMultipleSheets([
            {
                sheetName: 'Outstanding Summary',
                rows: outstandingRows,
                columns: outstandingColumns,
            },
            {
                sheetName: 'Monthly Summary',
                rows: monthlyRows,
                columns: monthlyColumns,
            },
        ], `loan_summary_${companyId}_${new Date().toISOString().slice(0, 10)}`);
        return this.awsService.uploadFilePath(filePath, companyId, 'report', 'loan-summary');
    }
    async generateLoanRepaymentReportToS3(companyId, format = 'csv', month) {
        const allData = await this.payrollService.getLoanRepaymentReport(companyId);
        let filteredData = allData;
        if (month && month !== 'all') {
            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr, 10);
            filteredData = allData.filter((r) => {
                const repaymentDate = new Date(r.lastRepayment);
                return (repaymentDate.getFullYear() === year &&
                    repaymentDate.getMonth() + 1 === monthNum);
            });
        }
        const rows = filteredData.map((r) => ({
            employeeName: r.employeeName,
            totalRepaid: r.totalRepaid,
            repaymentCount: r.repaymentCount,
            firstRepayment: r.firstRepayment,
            lastRepayment: r.lastRepayment,
        }));
        const columns = [
            { field: 'employeeName', title: 'Employee Name' },
            { field: 'totalRepaid', title: 'Total Repaid (₦)' },
            { field: 'repaymentCount', title: 'Repayment Count' },
            { field: 'firstRepayment', title: 'First Repayment Date' },
            { field: 'lastRepayment', title: 'Last Repayment Date' },
        ];
        const filename = month
            ? `loan_repayment_report_${companyId}_${month}`
            : `loan_repayment_report_${companyId}_${new Date().toISOString().split('T')[0]}`;
        if (format === 'excel') {
            return this.exportAndUploadExcel(rows, columns, filename, companyId, 'loan-repayment');
        }
        else {
            return this.exportAndUpload(rows, columns, filename, companyId, 'loan-repayment');
        }
    }
    async generateGLSummaryFromPayroll(companyId, month) {
        const payrolls = await this.db
            .select({
            payrollId: payroll_run_schema_1.payroll.id,
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            basic: payroll_run_schema_1.payroll.basic,
            housing: payroll_run_schema_1.payroll.housing,
            transport: payroll_run_schema_1.payroll.transport,
            netSalary: payroll_run_schema_1.payroll.netSalary,
            payeTax: payroll_run_schema_1.payroll.payeTax,
            pension: payroll_run_schema_1.payroll.pensionContribution,
            employerPension: payroll_run_schema_1.payroll.employerPensionContribution,
            nhf: payroll_run_schema_1.payroll.nhfContribution,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            expenses: payroll_run_schema_1.payroll.reimbursements,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month)));
        const deductionTypesData = await this.db
            .select({
            id: deduction_schema_1.deductionTypes.id,
            name: deduction_schema_1.deductionTypes.name,
        })
            .from(deduction_schema_1.deductionTypes);
        const deductionTypeMap = new Map(deductionTypesData.map((d) => [d.id, d.name]));
        if (!payrolls.length) {
            return {
                rows: [],
                columns: [],
                empty: true,
            };
        }
        const payrollRunIds = payrolls.map((p) => p.payrollRunId);
        const allowances = await this.db
            .select({
            payrollId: payroll_allowances_schema_1.payrollAllowances.payrollId,
            title: payroll_allowances_schema_1.payrollAllowances.allowance_type,
            amount: payroll_allowances_schema_1.payrollAllowances.allowanceAmount,
        })
            .from(payroll_allowances_schema_1.payrollAllowances)
            .where((0, drizzle_orm_1.inArray)(payroll_allowances_schema_1.payrollAllowances.payrollId, payrollRunIds));
        const grouped = new Map();
        for (const row of payrolls) {
            const ym = row.payrollMonth;
            const components = [
                { field: 'basic', label: 'Basic Salary', glCode: '5000' },
                { field: 'housing', label: 'Housing Allowance', glCode: '5001' },
                { field: 'transport', label: 'Transport Allowance', glCode: '5002' },
            ];
            for (const comp of components) {
                const amount = new decimal_js_1.default(row[comp.field] || 0);
                const key = `${comp.glCode}__${ym}`;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        glCode: comp.glCode,
                        label: comp.label,
                        yearMonth: ym,
                        debit: new decimal_js_1.default(0),
                        credit: new decimal_js_1.default(0),
                    });
                }
                grouped.get(key).debit = grouped.get(key).debit.plus(amount);
            }
            const voluntaryDeductions = Array.isArray(row.voluntaryDeductions)
                ? row.voluntaryDeductions
                : [];
            for (const d of voluntaryDeductions) {
                const amount = new decimal_js_1.default(d.amount || 0);
                const typeName = deductionTypeMap.get(d.typeId) || 'Voluntary Deduction';
                const label = `${typeName} (Voluntary Deduction)`;
                const glCode = '2400';
                const key = `${glCode}_${label}__${ym}`;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        glCode,
                        label,
                        yearMonth: ym,
                        debit: new decimal_js_1.default(0),
                        credit: new decimal_js_1.default(0),
                    });
                }
                grouped.get(key).credit = grouped.get(key).credit.plus(amount);
            }
            const advanceAmt = new decimal_js_1.default(row.salaryAdvance || 0);
            if (advanceAmt.gt(0)) {
                const advGl = '2405';
                const advLabel = 'Salary Advance';
                const advKey = `${advGl}__${ym}`;
                if (!grouped.has(advKey)) {
                    grouped.set(advKey, {
                        glCode: advGl,
                        label: advLabel,
                        yearMonth: ym,
                        debit: new decimal_js_1.default(0),
                        credit: new decimal_js_1.default(0),
                    });
                }
                grouped.get(advKey).credit = grouped
                    .get(advKey)
                    .credit.plus(advanceAmt);
            }
            const deductions = [
                { field: 'payeTax', glCode: '2100', label: 'PAYE' },
                { field: 'pension', glCode: '2200', label: 'Pension' },
                { field: 'employerPension', glCode: '2210', label: 'Employer Pension' },
                { field: 'nhf', glCode: '2300', label: 'NHF' },
            ];
            for (const d of deductions) {
                const amount = new decimal_js_1.default(row[d.field] || 0);
                const key = `${d.glCode}__${ym}`;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        glCode: d.glCode,
                        label: d.label,
                        yearMonth: ym,
                        debit: new decimal_js_1.default(0),
                        credit: new decimal_js_1.default(0),
                    });
                }
                grouped.get(key).credit = grouped.get(key).credit.plus(amount);
                if (d.field === 'employerPension') {
                    const balanceKey = `2211__${ym}`;
                    const balanceLabel = 'Employer Pension (Balance Sheet)';
                    if (!grouped.has(balanceKey)) {
                        grouped.set(balanceKey, {
                            glCode: '2211',
                            label: balanceLabel,
                            yearMonth: ym,
                            debit: new decimal_js_1.default(0),
                            credit: new decimal_js_1.default(0),
                        });
                    }
                    grouped.get(balanceKey).debit = grouped
                        .get(balanceKey)
                        .debit.plus(amount);
                }
            }
            const netAmount = new decimal_js_1.default(row.netSalary || 0);
            const netKey = `3000__${ym}`;
            if (!grouped.has(netKey)) {
                grouped.set(netKey, {
                    glCode: '3000',
                    label: 'Net Salary',
                    yearMonth: ym,
                    debit: new decimal_js_1.default(0),
                    credit: new decimal_js_1.default(0),
                });
            }
            grouped.get(netKey).credit = grouped.get(netKey).credit.plus(netAmount);
        }
        for (const allowance of allowances) {
            const payrollRow = payrolls.find((p) => p.payrollRunId === allowance.payrollId);
            if (!payrollRow)
                continue;
            const ym = payrollRow.payrollMonth;
            const label = `${allowance.title} Allowance`;
            const glCode = '5003';
            const key = `${glCode}_${label}__${ym}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    glCode,
                    label,
                    yearMonth: ym,
                    debit: new decimal_js_1.default(0),
                    credit: new decimal_js_1.default(0),
                });
            }
            grouped.get(key).debit = grouped
                .get(key)
                .debit.plus(new decimal_js_1.default(allowance.amount || 0));
        }
        for (const row of payrolls) {
            const ym = row.payrollMonth;
            const expenses = Array.isArray(row.expenses) ? row.expenses : [];
            for (const expense of expenses) {
                const expenseAmount = new decimal_js_1.default(expense.amount || 0);
                const expenseGlCode = '3005';
                const expenseLabel = `${expense.expenseName} Reimbursement`;
                const expenseKey = `${expenseGlCode}__${expense.expenseName}__${ym}`;
                if (!grouped.has(expenseKey)) {
                    grouped.set(expenseKey, {
                        glCode: expenseGlCode,
                        label: expenseLabel,
                        yearMonth: ym,
                        debit: new decimal_js_1.default(0),
                        credit: new decimal_js_1.default(0),
                    });
                }
                grouped.get(expenseKey).debit = grouped
                    .get(expenseKey)
                    .debit.plus(expenseAmount);
            }
        }
        let totalDebit = new decimal_js_1.default(0);
        let totalCredit = new decimal_js_1.default(0);
        const allEntries = Array.from(grouped.values());
        const earnings = allEntries.filter((entry) => ['Basic Salary', 'Housing Allowance', 'Transport Allowance'].includes(entry.label) || entry.glCode === '5003');
        const deductions = allEntries.filter((entry) => ['PAYE', 'Pension', 'Employer Pension', 'NHF'].includes(entry.label) ||
            entry.label.includes('(Voluntary Deduction)'));
        const netAndOthers = allEntries.filter((entry) => !earnings.includes(entry) && !deductions.includes(entry));
        const orderedEntries = [...earnings, ...deductions, ...netAndOthers];
        const rows = orderedEntries.map((entry) => {
            totalDebit = totalDebit.plus(entry.debit);
            totalCredit = totalCredit.plus(entry.credit);
            return {
                glAccountCode: entry.glCode,
                yearMonth: entry.yearMonth,
                label: entry.label,
                debit: entry.debit.gt(0) ? this.format(entry.debit) : '-',
                credit: entry.credit.gt(0) ? this.format(entry.credit) : '-',
            };
        });
        rows.push({
            glAccountCode: '',
            yearMonth: '',
            label: 'Total',
            debit: this.format(totalDebit),
            credit: this.format(totalCredit),
        });
        const columns = [
            { field: 'glAccountCode', title: 'GL Code' },
            { field: 'yearMonth', title: 'Year-Month' },
            { field: 'label', title: 'Account Description' },
            { field: 'debit', title: 'Debit (₦)' },
            { field: 'credit', title: 'Credit (₦)' },
        ];
        return {
            rows,
            columns,
        };
    }
    async generateGLSummaryFromPayrollToS3(companyId, month) {
        const res = await this.generateGLSummaryFromPayroll(companyId, month);
        const filename = `gl_summary_${companyId}_${month}`;
        return this.exportAndUploadMatrix(res.rows, res.columns, filename, companyId, 'payroll-gl-summary');
    }
};
exports.GenerateReportService = GenerateReportService;
exports.GenerateReportService = GenerateReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, report_service_1.ReportService,
        s3_storage_service_1.S3StorageService])
], GenerateReportService);
//# sourceMappingURL=generate-report.service.js.map