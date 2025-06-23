import { OrgNode } from '../types/orgNode.type';

export function buildOrgTree(flatEmployees: OrgNode[]): OrgNode[] {
  const employeeMap = new Map<string, OrgNode>();

  // 1. Initialize map
  flatEmployees.forEach((emp) => {
    employeeMap.set(emp.id, { ...emp, children: [] }); // ensure children array exists
  });

  // 2. Build tree
  const tree: OrgNode[] = [];

  employeeMap.forEach((emp) => {
    if (emp.managerId) {
      const manager = employeeMap.get(emp.managerId);
      if (manager) {
        manager.children.push(emp);
      }
    } else {
      tree.push(emp);
    }
  });

  return tree;
}
