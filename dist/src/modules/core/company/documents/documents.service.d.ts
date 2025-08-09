import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class DocumentsService {
    private readonly db;
    private readonly audit;
    private readonly s3Service;
    private readonly logger;
    private readonly cache;
    constructor(db: db, audit: AuditService, s3Service: S3StorageService, logger: PinoLogger, cache: CacheService);
    private foldersListKey;
    private burstFolderLists;
    uploadDocument(dto: CreateDocumentDto, user: User): Promise<{
        id: any;
        name: string;
        url: string;
    }>;
    deleteCompanyFile(fileId: string, user: User): Promise<{
        success: boolean;
    }>;
}
