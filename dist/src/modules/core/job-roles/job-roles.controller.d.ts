import { JobRolesService } from './job-roles.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class JobRolesController extends BaseController {
    private readonly jobRolesService;
    constructor(jobRolesService: JobRolesService);
    create(createJobRoleDto: CreateJobRoleDto, user: User): Promise<{
        id: string;
    }[]>;
    bulkCreate(rows: any[], user: User): Promise<{
        id: string;
        title: string;
    }[]>;
    findAll(user: User): Promise<{
        id: string;
        title: string;
        level: string | null;
        description: string | null;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        title: string;
        level: string | null;
        description: string | null;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateJobRoleDto: UpdateJobRoleDto, user: User, ip: string): Promise<{
        id: any;
    }>;
    remove(id: string, user: User): Promise<any>;
}
