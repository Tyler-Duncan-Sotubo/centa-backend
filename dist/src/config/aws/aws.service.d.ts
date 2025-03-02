import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
export declare class AwsService {
    private configService;
    private db;
    private s3Client;
    constructor(configService: ConfigService, db: db);
    uploadFile(filePath: string, fileName: string, companyId: string, type: string, category: string): Promise<string>;
    uploadCsvToS3(companyId: string, employees: any[]): Promise<any>;
    uploadImageToS3(email: string, fileName: string, image: any): Promise<string>;
    uploadPdfToS3(email: string, fileName: string, pdfBuffer: Buffer): Promise<string>;
    getSignedUrl(key: string): Promise<string>;
}
