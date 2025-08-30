"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotQueries = void 0;
class HotQueries {
    constructor(pool) {
        this.pool = pool;
    }
    async activeDeductions(empId, payDate) {
        const query = {
            name: 'active_deductions_v1',
            text: `
        select *
        from employee_deductions
        where employee_id = $1
          and is_active = true
          and start_date <= $2
          and (end_date >= $2 or end_date is null)
      `,
            values: [empId, payDate],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async bonusesByRange(empId, startISO, endISO) {
        const query = {
            name: 'bonuses_by_range_v1',
            text: `
        select *
        from payroll_bonuses
        where employee_id = $1
          and effective_date >= $2
          and effective_date <  $3
      `,
            values: [empId, startISO, endISO],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async payGroupById(payGroupId) {
        const query = {
            name: 'pay_group_by_id_v1',
            text: `
        select *
        from pay_groups
        where id = $1
        limit 1
      `,
            values: [payGroupId],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async groupAllowances(payGroupId) {
        const query = {
            name: 'group_allowances_v1',
            text: `
        select
          allowance_type as type,
          value_type     as "valueType",
          percentage     as pct,
          fixed_amount   as fixed
        from pay_group_allowances
        where pay_group_id = $1
      `,
            values: [payGroupId],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async adjustmentsByDate(companyId, empId, payrollDate) {
        const query = {
            name: 'adjustments_by_date_v1',
            text: `
        select *
        from payroll_adjustments
        where company_id  = $1
          and employee_id = $2
          and payroll_date= $3
      `,
            values: [companyId, empId, payrollDate],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async expensesByRange(empId, startISO, endISO) {
        const query = {
            name: 'expenses_by_range_v1',
            text: `
        select id, category, amount
        from expenses
        where employee_id   = $1
          and status        = 'pending'
          and submitted_at >= $2
          and submitted_at <= $3
      `,
            values: [empId, startISO, endISO],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async employeeName(empId) {
        const query = {
            name: 'employee_name_v1',
            text: `
        select first_name as "firstName", last_name as "lastName"
        from employees
        where id = $1
        limit 1
      `,
            values: [empId],
        };
        const { rows } = await this.pool.query(query);
        return rows[0];
    }
}
exports.HotQueries = HotQueries;
//# sourceMappingURL=hot-queries.js.map