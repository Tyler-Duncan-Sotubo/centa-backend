export declare class OrgChartNodeDto {
    id: string;
    name: string;
    title: string;
    department: string;
    managerId: string | null;
    avatar?: string | null;
    isDepartmentHead?: boolean;
    hasChildren: boolean;
    childrenCount: number;
    children: OrgChartNodeDto[];
}
