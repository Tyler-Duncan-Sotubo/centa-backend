import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class PayGroupsService {
    private readonly db;
    private readonly cacheService;
    private readonly auditService;
    private readonly companySettings;
    constructor(db: db, cacheService: CacheService, auditService: AuditService, companySettings: CompanySettingsService);
    private getCompanyIdByEmployeeId;
    private getCompanyIdByGroupId;
    findOneEmployee(employeeId: string): Promise<{
        id: any;
    } | {
        id: any;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        name: string;
        pay_schedule_id: string;
        apply_nhf: boolean | null;
        apply_pension: boolean | null;
        apply_paye: boolean | null;
        payFrequency: string;
        createdAt: Date | null;
    }[]>;
    findOne(groupId: string): Promise<{
        id: string;
        name: string;
        applyPaye: boolean | null;
        applyPension: boolean | null;
        applyNhf: boolean | null;
        payScheduleId: string;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        isDeleted: boolean | null;
    }>;
    findEmployeesInGroup(groupId: string): Promise<({
        id: any;
        first_name: any;
        last_name: any;
    } | {
        id: any;
        first_name: any;
        last_name: any;
    })[]>;
    create(user: User, dto: CreatePayGroupDto, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        applyPaye: boolean | null;
        applyPension: boolean | null;
        applyNhf: boolean | null;
        isDeleted: boolean | null;
        payScheduleId: string;
    }>;
    update(groupId: string, dto: UpdatePayGroupDto, user: User, ip: string): Promise<{
        message: string;
    }>;
    remove(groupId: string, user: any, ip: string): Promise<{
        message: string;
    }>;
    addEmployeesToGroup(employeeIds: string[] | string, groupId: string, user: User, ip: string): Promise<{
        message: string;
    }>;
    removeEmployeesFromGroup(employeeIds: string[] | string, user: User, ip: string): Promise<{
        message: string;
    }>;
}
