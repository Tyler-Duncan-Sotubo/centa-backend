import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';
export declare class DocumentsFolderService {
    private readonly db;
    private readonly audit;
    constructor(db: db, audit: AuditService);
    private getFolderOrThrow;
    private assertValidParentOrNull;
    private assertNoCycle;
    private assertUniqueNameInParent;
    create(createDto: CreateDocumentFoldersDto, user: User): Promise<any>;
    findAll(companyId: string): Promise<any[]>;
    findOne(id: string): Promise<{
        [x: string]: any;
    }>;
    update(id: string, dto: UpdateDocumentFoldersDto, user: User): Promise<{
        [x: string]: any;
    }>;
    remove(id: string, userId: string): Promise<{
        success: boolean;
    }>;
}
