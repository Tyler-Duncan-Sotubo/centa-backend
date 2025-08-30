import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';
export declare class DocumentsFolderService {
    private readonly db;
    private readonly audit;
    constructor(db: db, audit: AuditService);
    create(createDto: CreateDocumentFoldersDto, user: User): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        companyId: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
    }>;
    findAll(companyId: string): Promise<{
        files: {
            name: string;
            id: string;
            createdAt: Date | null;
            companyId: string;
            type: string;
            category: string;
            folderId: string | null;
            url: string;
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
}
