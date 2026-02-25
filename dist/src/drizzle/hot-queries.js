"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotQueries = void 0;
function chunk(arr, size) {
    if (size <= 0)
        return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i += size)
        out.push(arr.slice(i, i + size));
    return out;
}
class HotQueries {
    constructor(pool) {
        this.pool = pool;
    }
    setRunCache(cache) {
        this.runCache = cache;
    }
    clearRunCache() {
        this.runCache = undefined;
    }
    async activeDeductions(empId, payDate) {
        const cached = this.runCache?.deductionsByEmp?.get(empId);
        if (cached)
            return cached;
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
    async bonusesByRange(empId, startISO, endISOExclusive) {
        const cached = this.runCache?.bonusesByEmp?.get(empId);
        if (cached)
            return cached;
        const query = {
            name: 'bonuses_by_range_v2',
            text: `
        select *
        from payroll_bonuses
        where employee_id = $1
          and status = 'active'
          and effective_date >= $2
          and effective_date <  $3
      `,
            values: [empId, startISO, endISOExclusive],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async payGroupById(payGroupId) {
        const cached = this.runCache?.payGroupById?.get(payGroupId);
        if (cached)
            return cached;
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
        return rows[0] ?? null;
    }
    async groupAllowances(payGroupId) {
        const cached = this.runCache?.groupAllowByPg?.get(payGroupId);
        if (cached)
            return cached;
        const query = {
            name: 'group_allowances_v1',
            text: `
        select
          allowance_type as type,
          value_type     as "valueType",
          percentage     as pct,
          fixed_amount   as fixed,
          pay_group_id
        from pay_group_allowances
        where pay_group_id = $1
      `,
            values: [payGroupId],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async adjustmentsByDate(companyId, empId, payrollDate) {
        const cached = this.runCache?.adjustmentsByEmp?.get(empId);
        if (cached)
            return cached;
        const query = {
            name: 'adjustments_by_date_v1',
            text: `
        select *
        from payroll_adjustments
        where company_id   = $1
          and employee_id  = $2
          and payroll_date = $3
      `,
            values: [companyId, empId, payrollDate],
        };
        const { rows } = await this.pool.query(query);
        return rows;
    }
    async expensesByRange(empId, startISO, endISO) {
        const cached = this.runCache?.expensesByEmp?.get(empId);
        if (cached)
            return cached;
        const query = {
            name: 'expenses_by_range_v1',
            text: `
        select id, category, amount, employee_id
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
    async activeDeductionsForMany(empIds, payDate) {
        if (empIds.length === 0)
            return [];
        const chunks = chunk(empIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'active_deductions_many_v1',
                text: `
          select *
          from employee_deductions
          where employee_id = any($1::uuid[])
            and is_active = true
            and start_date <= $2
            and (end_date >= $2 or end_date is null)
        `,
                values: [part, payDate],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
    async bonusesByRangeForMany(empIds, startISO, endISOExclusive) {
        if (empIds.length === 0)
            return [];
        const chunks = chunk(empIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'bonuses_by_range_many_v2',
                text: `
          select *
          from payroll_bonuses
          where employee_id = any($1::uuid[])
            and status = 'active'
            and effective_date >= $2
            and effective_date <  $3
        `,
                values: [part, startISO, endISOExclusive],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
    async payGroupsByIds(payGroupIds) {
        if (payGroupIds.length === 0)
            return [];
        const chunks = chunk(payGroupIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'pay_groups_many_v1',
                text: `
          select *
          from pay_groups
          where id = any($1::uuid[])
        `,
                values: [part],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
    async groupAllowancesForPayGroups(payGroupIds) {
        if (payGroupIds.length === 0)
            return [];
        const chunks = chunk(payGroupIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'group_allowances_many_v1',
                text: `
          select
            allowance_type as type,
            value_type     as "valueType",
            percentage     as pct,
            fixed_amount   as fixed,
            pay_group_id
          from pay_group_allowances
          where pay_group_id = any($1::uuid[])
        `,
                values: [part],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
    async adjustmentsByDateForMany(companyId, empIds, payrollDate) {
        if (empIds.length === 0)
            return [];
        const chunks = chunk(empIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'adjustments_by_date_many_v1',
                text: `
          select *
          from payroll_adjustments
          where company_id   = $1
            and employee_id  = any($2::uuid[])
            and payroll_date = $3
        `,
                values: [companyId, part, payrollDate],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
    async expensesByRangeForMany(empIds, startISO, endISO) {
        if (empIds.length === 0)
            return [];
        const chunks = chunk(empIds, 10_000);
        const out = [];
        for (const part of chunks) {
            const q = {
                name: 'expenses_by_range_many_v1',
                text: `
          select id, category, amount, employee_id
          from expenses
          where employee_id   = any($1::uuid[])
            and status        = 'pending'
            and submitted_at >= $2
            and submitted_at <= $3
        `,
                values: [part, startISO, endISO],
            };
            const { rows } = await this.pool.query(q);
            out.push(...rows);
        }
        return out;
    }
}
exports.HotQueries = HotQueries;
//# sourceMappingURL=hot-queries.js.map