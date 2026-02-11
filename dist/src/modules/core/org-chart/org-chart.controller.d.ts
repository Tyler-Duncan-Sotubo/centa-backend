import { OrgChartService } from './org-chart.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class OrgChartController extends BaseController {
    private readonly orgChartService;
    constructor(orgChartService: OrgChartService);
    getOrgChartRoots(user: User): Promise<import("./dto/org-chart-node.dto").OrgChartNodeDto[]>;
    getPreview(user: User, depth: string): Promise<import("./dto/org-chart-node.dto").OrgChartNodeDto[]>;
    getOrgChartChildren(user: User, managerId: string): Promise<import("./dto/org-chart-node.dto").OrgChartNodeDto[]>;
    getEmployeeOrgChart(user: User, employeeId: string): Promise<{
        chain: import("./dto/org-chart-node.dto").OrgChartNodeDto[];
        focus: import("./dto/org-chart-node.dto").OrgChartNodeDto;
        directReports: import("./dto/org-chart-node.dto").OrgChartNodeDto[];
    }>;
    getMyTeam(employeeId: string, user: User): Promise<import("./dto/org-chart-node.dto").OrgChartNodeDto[]>;
    getMyTeamContext(employeeId: string, user: User): Promise<{
        me: import("./dto/org-chart-node.dto").OrgChartNodeDto;
        manager: import("./dto/org-chart-node.dto").OrgChartNodeDto | null;
        peers: import("./dto/org-chart-node.dto").OrgChartNodeDto[];
        directReports: import("./dto/org-chart-node.dto").OrgChartNodeDto[];
    }>;
}
