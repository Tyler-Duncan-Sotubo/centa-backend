"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrgTree = buildOrgTree;
function buildOrgTree(flatEmployees) {
    const employeeMap = new Map();
    flatEmployees.forEach((emp) => {
        employeeMap.set(emp.id, { ...emp, children: [] });
    });
    const tree = [];
    employeeMap.forEach((emp) => {
        if (emp.managerId) {
            const manager = employeeMap.get(emp.managerId);
            if (manager) {
                manager.children.push(emp);
            }
        }
        else {
            tree.push(emp);
        }
    });
    return tree;
}
//# sourceMappingURL=build-org-tree.js.map