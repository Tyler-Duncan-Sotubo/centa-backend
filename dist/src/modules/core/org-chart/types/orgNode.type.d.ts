export interface OrgNode {
    id: string;
    name: string;
    title: string;
    managerId?: string | null;
    children: OrgNode[];
    department?: string;
    locationName?: string;
    avatarUrl?: string;
}
