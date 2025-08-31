import { PayGroupsService } from './pay-groups.service';
import { CreatePayGroupDto } from './dto/create-pay-group.dto';
import { UpdatePayGroupDto } from './dto/update-pay-group.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PayGroupsController extends BaseController {
    private readonly payGroupsService;
    constructor(payGroupsService: PayGroupsService);
    createEmployeeGroup(dto: CreatePayGroupDto, user: User, ip: string): Promise<{
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
    getEmployeeGroups(user: User): Promise<{
        id: string;
        name: string;
        pay_schedule_id: string;
        apply_nhf: boolean | null;
        apply_pension: boolean | null;
        apply_paye: boolean | null;
        payFrequency: string;
        createdAt: Date | null;
    }[]>;
    getEmployeeGroup(groupId: string): Promise<{
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
    updateEmployeeGroup(dto: UpdatePayGroupDto, groupId: string, user: User, ip: string): Promise<{
        message: string;
    }>;
    deleteEmployeeGroup(groupId: string, user: User, ip: string): Promise<{
        message: string;
    }>;
    getEmployeesInGroup(groupId: string): Promise<({
        id: any;
        first_name: any;
        last_name: any;
    } | {
        id: any;
        first_name: any;
        last_name: any;
    })[]>;
    addEmployeeToGroup(employees: string | string[], groupId: string, user: User, ip: string): Promise<{
        message: string;
    }>;
    removeEmployeeFromGroup(employeeIds: {
        employee_id: string;
    }, user: User, ip: string): Promise<{
        message: string;
    }>;
}
