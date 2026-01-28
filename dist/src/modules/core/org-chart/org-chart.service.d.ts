import { db } from 'src/drizzle/types/drizzle';
import { OrgChartNodeDto } from './dto/org-chart-node.dto';
export declare class OrgChartService {
    private readonly db;
    constructor(db: db);
    private baseSelect;
    getRoots(companyId: string): Promise<OrgChartNodeDto[]>;
    getChildren(companyId: string, managerId: string): Promise<OrgChartNodeDto[]>;
    getPreview(companyId: string, depth?: number): Promise<OrgChartNodeDto[]>;
    getEmployeeOrgChart(companyId: string, employeeId: string): Promise<{
        chain: OrgChartNodeDto[];
        focus: OrgChartNodeDto;
        directReports: OrgChartNodeDto[];
    }>;
    private attachChildCounts;
}
