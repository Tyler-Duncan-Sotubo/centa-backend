export class OrgChartNodeDto {
  id: string; // employee id
  name: string; // full name
  title: string; // job role title
  managerId?: string | null; // optional manager reference
  children: OrgChartNodeDto[]; // nested direct reports

  // (Optional fields you can add later)
  department?: string;
  locationName?: string;
  avatarUrl?: string;
}
