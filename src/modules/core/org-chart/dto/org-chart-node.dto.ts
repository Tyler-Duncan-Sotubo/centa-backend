export class OrgChartNodeDto {
  id: string;
  name: string;
  title: string;
  department: string;
  managerId: string | null;

  avatar?: string | null;
  isDepartmentHead?: boolean;

  // ✅ required for your UI + service
  hasChildren: boolean;
  childrenCount: number;

  // ✅ for roots/preview responses
  children: OrgChartNodeDto[];
}
