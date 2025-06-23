export declare class OrgChartNodeDto {
    id: string;
    name: string;
    title: string;
    managerId?: string | null;
    children: OrgChartNodeDto[];
    department?: string;
    locationName?: string;
    avatarUrl?: string;
}
