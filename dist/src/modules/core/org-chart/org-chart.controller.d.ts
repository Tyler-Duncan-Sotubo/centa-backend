import { OrgChartService } from './org-chart.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class OrgChartController extends BaseController {
    private readonly orgChartService;
    constructor(orgChartService: OrgChartService);
    getOrgChart(user: User): Promise<import("./dto/org-chart-node.dto").OrgChartNodeDto[]>;
}
