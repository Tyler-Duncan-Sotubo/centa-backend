import { CreateDocumentDto } from './dto/create-document.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
export declare class DocumentsService {
    private readonly db;
    private readonly audit;
    private readonly s3Service;
    constructor(db: db, audit: AuditService, s3Service: S3StorageService);
    uploadDocument(dto: CreateDocumentDto, user: User): Promise<{
        id: any;
        name: any;
        url: string;
    }>;
    deleteCompanyFile(fileId: string, user: User): Promise<{
        success: boolean;
    }>;
}
