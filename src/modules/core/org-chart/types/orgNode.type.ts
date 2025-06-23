export interface OrgNode {
  id: string;
  name: string;
  title: string;
  managerId?: string | null;
  children: OrgNode[];
  department?: string; // (optional) show dept
  locationName?: string; // (optional) show office location
  avatarUrl?: string; // (optional) for profile pictures
}
