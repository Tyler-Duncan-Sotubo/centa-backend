import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
export declare class AwsService {
    private configService;
    private db;
    private s3Client;
    constructor(configService: ConfigService, db: db);
    ensureReportsFolder(companyId: string): Promise<string>;
    uploadImageToS3(email: string, fileName: string, image: any): Promise<string>;
    uploadPdfToS3(email: string, fileName: string, pdfBuffer: Buffer): Promise<string>;
    getSignedUrl(key: string): Promise<string>;
}
