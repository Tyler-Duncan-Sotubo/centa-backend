// src/payroll/hot-queries.ts
import { Pool, QueryConfig } from 'pg';

type Row = Record<string, any>;

export type HotRunCache = {
  deductionsByEmp: Map<string, Row[]>;
  bonusesByEmp: Map<string, Row[]>;
  adjustmentsByEmp: Map<string, Row[]>;
  expensesByEmp: Map<string, Row[]>;
  payGroupById: Map<string, Row>;
  groupAllowByPg: Map<string, Row[]>;
};

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export class HotQueries {
  constructor(private pool: Pool) {}

  private runCache?: HotRunCache;

  setRunCache(cache: HotRunCache) {
    this.runCache = cache;
  }

  clearRunCache() {
    this.runCache = undefined;
  }

  // -------------------------
  // Single-employee queries
  // -------------------------

  async activeDeductions(empId: string, payDate: string) {
    const cached = this.runCache?.deductionsByEmp?.get(empId);
    if (cached) return cached;

    const query: QueryConfig = {
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

  async bonusesByRange(
    empId: string,
    startISO: string,
    endISOExclusive: string,
  ) {
    const cached = this.runCache?.bonusesByEmp?.get(empId);
    if (cached) return cached;

    const query: QueryConfig = {
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

  async payGroupById(payGroupId: string) {
    const cached = this.runCache?.payGroupById?.get(payGroupId);
    if (cached) return cached;

    const query: QueryConfig = {
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

  async groupAllowances(payGroupId: string) {
    const cached = this.runCache?.groupAllowByPg?.get(payGroupId);
    if (cached) return cached;

    const query: QueryConfig = {
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

  async adjustmentsByDate(
    companyId: string,
    empId: string,
    payrollDate: string,
  ) {
    const cached = this.runCache?.adjustmentsByEmp?.get(empId);
    if (cached) return cached;

    const query: QueryConfig = {
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

  async expensesByRange(empId: string, startISO: string, endISO: string) {
    const cached = this.runCache?.expensesByEmp?.get(empId);
    if (cached) return cached;

    const query: QueryConfig = {
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
    return rows as Array<{ id: string; category: string; amount: string }>;
  }

  async employeeName(empId: string) {
    const query: QueryConfig = {
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
    return rows[0] as { firstName: string; lastName: string } | undefined;
  }

  // -------------------------
  // Batch (“…ForMany”) queries
  // -------------------------

  async activeDeductionsForMany(
    empIds: string[],
    payDate: string,
  ): Promise<Row[]> {
    if (empIds.length === 0) return [];
    const chunks = chunk(empIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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

  // ✅ UPDATED: add status='active' + use endISOExclusive naming + new prepared name
  async bonusesByRangeForMany(
    empIds: string[],
    startISO: string,
    endISOExclusive: string,
  ): Promise<Row[]> {
    if (empIds.length === 0) return [];
    const chunks = chunk(empIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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

  async payGroupsByIds(payGroupIds: string[]): Promise<Row[]> {
    if (payGroupIds.length === 0) return [];
    const chunks = chunk(payGroupIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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

  async groupAllowancesForPayGroups(payGroupIds: string[]): Promise<Row[]> {
    if (payGroupIds.length === 0) return [];
    const chunks = chunk(payGroupIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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

  async adjustmentsByDateForMany(
    companyId: string,
    empIds: string[],
    payrollDate: string,
  ): Promise<Row[]> {
    if (empIds.length === 0) return [];
    const chunks = chunk(empIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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

  async expensesByRangeForMany(
    empIds: string[],
    startISO: string,
    endISO: string,
  ): Promise<Row[]> {
    if (empIds.length === 0) return [];
    const chunks = chunk(empIds, 10_000);
    const out: Row[] = [];

    for (const part of chunks) {
      const q: QueryConfig = {
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
