import { Injectable, Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { departments, employees, jobRoles } from '../schema';
import { eq } from 'drizzle-orm';
import { OrgNode } from './types/orgNode.type';
import { buildOrgTree } from './utils/build-org-tree';
import { OrgChartNodeDto } from './dto/org-chart-node.dto';
import { companyRoles, users } from 'src/drizzle/schema';

@Injectable()
export class OrgChartService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async buildOrgChart(companyId: string): Promise<OrgChartNodeDto[]> {
    // 1. Fetch the CEO from users
    const [ceoUser] = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(eq(companyRoles.name, 'super_admin'))
      .limit(1);

    // 2. Fetch all employees + job role + department
    const allEmployees = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        managerId: employees.managerId,
        jobRoleTitle: jobRoles.title,
        departmentName: departments.name,
        head: departments.headId,
      })
      .from(employees)
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.companyId, companyId));

    // 3. Assemble flat list of OrgNodes
    const orgNodes: OrgNode[] = [];

    // CEO node
    orgNodes.push({
      id: ceoUser.id,
      name: `${ceoUser.firstName} ${ceoUser.lastName}`,
      title: 'CEO',
      department: '',
      managerId: null,
      children: [],
    });

    // Employee nodes
    allEmployees.forEach((emp) => {
      orgNodes.push({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        title: emp.jobRoleTitle ?? '',
        department: emp.departmentName ?? '',
        managerId: emp.managerId ?? ceoUser.id,
        children: [],
      });
    });

    // 4. Build the hierarchical tree
    const tree = buildOrgTree(orgNodes);

    // 5. Map to DTO
    return this.mapToDto(tree);
  }

  private mapToDto(nodes: OrgNode[]): OrgChartNodeDto[] {
    return nodes.map((node) => ({
      id: node.id,
      name: node.name,
      title: node.title,
      department: node.department,
      managerId: node.managerId,
      children: this.mapToDto(node.children),
    }));
  }
}
