import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
export declare class S3StorageService {
    private readonly configService;
    private readonly db;
    private readonly s3;
    constructor(configService: ConfigService, db: db);
    uploadBuffer(buffer: Buffer, key: string, companyId: string, type: string, category: string, mimeType: string): Promise<{
        url: string;
        record: any;
    }>;
    uploadFilePath(filePath: string, companyId: string, type: string, category: string): Promise<{
        url: string;
        record: any;
    }>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    private getMimeType;
}
