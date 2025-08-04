import { CompanyService } from 'src/modules/core/company/company.service';
import { PerformanceSettingsService } from '../performance-settings/performance-settings.service';
import { AppraisalCycleService } from './appraisal-cycle.service';
import { AppraisalsService } from './appraisals.service';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
export declare class AutoCreatePerformanceCronService {
    private readonly companyService;
    private readonly settingsService;
    private readonly cycleService;
    private readonly appraisalService;
    private readonly employeeService;
    private readonly logger;
    constructor(companyService: CompanyService, settingsService: PerformanceSettingsService, cycleService: AppraisalCycleService, appraisalService: AppraisalsService, employeeService: EmployeesService);
    handlePerformanceAutomation(): Promise<void>;
    private generateNextCycleRange;
}
