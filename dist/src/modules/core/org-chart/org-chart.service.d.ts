import { db } from 'src/drizzle/types/drizzle';
import { OrgChartNodeDto } from './dto/org-chart-node.dto';
export declare class OrgChartService {
    private readonly db;
    constructor(db: db);
    buildOrgChart(companyId: string): Promise<OrgChartNodeDto[]>;
    private mapToDto;
}
