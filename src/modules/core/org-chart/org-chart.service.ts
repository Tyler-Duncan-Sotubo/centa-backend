import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { employees, departments, jobRoles, users } from 'src/drizzle/schema';
import { OrgChartNodeDto } from './dto/org-chart-node.dto';

type RowNode = {
  id: string;
  firstName: string;
  lastName: string;
  managerId: string | null;
  jobRoleTitle: string | null;
  departmentName: string | null;
  departmentId?: string | null;
  avatar: string | null;
  isDepartmentHead: boolean | null;
};

@Injectable()
export class OrgChartService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  private baseSelect = {
    id: employees.id,
    firstName: employees.firstName,
    lastName: employees.lastName,
    managerId: employees.managerId,
    jobRoleTitle: jobRoles.title,
    departmentName: departments.name,
    departmentId: departments.id,
    avatar: users.avatar,
    isDepartmentHead: sql<boolean>`${departments.headId} = ${employees.id}`,
  };

  async getRoots(companyId: string): Promise<OrgChartNodeDto[]> {
    const roots = await this.db
      .select(this.baseSelect)
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(eq(employees.companyId, companyId), isNull(employees.managerId)),
      );

    const rootsWithCounts = await this.attachChildCounts(companyId, roots);
    const rootIds = rootsWithCounts.map((r) => r.id);
    if (!rootIds.length) return rootsWithCounts;

    const children = await this.db
      .select(this.baseSelect)
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.companyId, companyId),
          inArray(employees.managerId, rootIds),
        ),
      );

    const childrenWithCounts = await this.attachChildCounts(
      companyId,
      children,
    );

    const byManager = new Map<string, OrgChartNodeDto[]>();
    for (const c of childrenWithCounts) {
      if (!c.managerId) continue;
      const arr = byManager.get(c.managerId) ?? [];
      arr.push(c);
      byManager.set(c.managerId, arr);
    }

    return rootsWithCounts.map((r) => ({
      ...r,
      children: byManager.get(r.id) ?? [],
    }));
  }

  async getChildren(
    companyId: string,
    managerId: string,
  ): Promise<OrgChartNodeDto[]> {
    const kids = await this.db
      .select(this.baseSelect)
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employees.managerId, managerId),
        ),
      );

    return this.attachChildCounts(companyId, kids);
  }

  /**
   * ✅ PREVIEW N LEVELS FROM ROOTS
   * default 4 layers (roots = layer1, ... layer4)
   */
  async getPreview(companyId: string, depth = 4): Promise<OrgChartNodeDto[]> {
    if (depth < 1) return [];

    // 1) roots
    const rootRows = await this.db
      .select(this.baseSelect)
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(eq(employees.companyId, companyId), isNull(employees.managerId)),
      );

    const roots = await this.attachChildCounts(companyId, rootRows);
    if (!roots.length || depth === 1) return roots;

    // BFS level fetches: each step is ONE query + ONE counts query (via attachChildCounts)
    const nodeById = new Map<string, OrgChartNodeDto>();
    for (const r of roots) nodeById.set(r.id, r);

    let currentLevelIds = roots.map((r) => r.id);

    for (let level = 2; level <= depth; level++) {
      if (!currentLevelIds.length) break;

      const childRows = await this.db
        .select(this.baseSelect)
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            eq(employees.companyId, companyId),
            inArray(employees.managerId, currentLevelIds),
          ),
        );

      const children = await this.attachChildCounts(companyId, childRows);
      if (!children.length) break;

      // attach to parents
      const nextLevelIds: string[] = [];
      for (const c of children) {
        nodeById.set(c.id, c);
        nextLevelIds.push(c.id);

        if (!c.managerId) continue;
        const parent = nodeById.get(c.managerId);
        if (parent) parent.children = [...(parent.children ?? []), c];
      }

      currentLevelIds = nextLevelIds;
    }

    // return roots with nested children populated
    return roots;
  }

  /**
   * ✅ SIMPLE ORG CHART FOR AN EMPLOYEE (context view)
   * Returns:
   * - chain from root -> ... -> employee
   * - the employee's direct reports (one level)
   *
   * This is perfect for your "focus" UI.
   */
  async getEmployeeOrgChart(
    companyId: string,
    employeeId: string,
  ): Promise<{
    chain: OrgChartNodeDto[]; // root -> ... -> employee
    focus: OrgChartNodeDto; // employee node
    directReports: OrgChartNodeDto[]; // employee's kids
  }> {
    // Fetch employee first (ensure exists)
    const [empRow] = await this.db
      .select(this.baseSelect)
      .from(employees)
      .leftJoin(users, eq(employees.userId, users.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(eq(employees.companyId, companyId), eq(employees.id, employeeId)),
      )
      .limit(1);

    if (!empRow) throw new NotFoundException('Employee not found');

    // Walk up to root via managerId
    const chainRows: RowNode[] = [empRow];
    let cursor = empRow.managerId;

    // safety stop to avoid infinite loops
    for (let i = 0; i < 25 && cursor; i++) {
      const [mgr] = await this.db
        .select(this.baseSelect)
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(eq(employees.companyId, companyId), eq(employees.id, cursor)),
        )
        .limit(1);

      if (!mgr) break; // broken chain, stop
      chainRows.push(mgr);
      cursor = mgr.managerId;
    }

    // chainRows is employee -> ... -> root, reverse it
    const chainDtos = await this.attachChildCounts(companyId, chainRows);
    const chain = [...chainDtos].reverse();

    const focus = chain[chain.length - 1];

    // Direct reports for employee
    const directReports = await this.getChildren(companyId, employeeId);

    return { chain, focus, directReports };
  }

  private async attachChildCounts(
    companyId: string,
    rows: RowNode[],
  ): Promise<OrgChartNodeDto[]> {
    if (!rows.length) return [];

    const ids = rows.map((r) => r.id);

    const counts = await this.db
      .select({
        managerId: employees.managerId,
        count: sql<number>`count(*)`,
      })
      .from(employees)
      .where(
        and(
          eq(employees.companyId, companyId),
          inArray(employees.managerId, ids),
        ),
      )
      .groupBy(employees.managerId);

    const countById = new Map<string, number>();
    for (const c of counts) {
      if (c.managerId) countById.set(c.managerId, Number(c.count ?? 0));
    }

    return rows.map((r) => {
      const childrenCount = countById.get(r.id) ?? 0;

      return {
        id: r.id,
        name: `${r.firstName} ${r.lastName}`.trim(),
        title: r.jobRoleTitle ?? '',
        department: r.departmentName ?? '',
        managerId: r.managerId ?? null,
        avatar: r.avatar ?? null,
        isDepartmentHead: Boolean(r.isDepartmentHead),
        childrenCount,
        hasChildren: childrenCount > 0,
        children: [],
      };
    });
  }
}
