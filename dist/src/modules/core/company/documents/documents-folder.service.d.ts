import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class DocumentsFolderService {
    private readonly db;
    private readonly audit;
    private readonly logger;
    private readonly cache;
    constructor(db: db, audit: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private oneKey;
    private burst;
    private upsertPermissions;
    create(createDto: CreateDocumentFoldersDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
        createdBy: string | null;
        permissionControlled: boolean | null;
        isSystem: boolean;
    }>;
    update(id: string, dto: UpdateDocumentFoldersDto, user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }>;
    remove(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    findAll(companyId: string): Promise<{
        files: {
            url: string;
            id: string;
            name: string;
            createdAt: Date | null;
            companyId: string;
            type: string;
            category: string;
            folderId: string | null;
            uploadedBy: string | null;
        }[];
        roleIds: string[];
        departmentIds: string[];
        officeIds: string[];
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }>;
}
