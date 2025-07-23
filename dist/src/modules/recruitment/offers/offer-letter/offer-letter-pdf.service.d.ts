import { db } from 'src/drizzle/types/drizzle';
import { AwsService } from 'src/common/aws/aws.service';
export declare class OfferLetterPdfService {
    private readonly db;
    private readonly awsService;
    constructor(db: db, awsService: AwsService);
    generateAndUploadPdf({ templateId, offerId, candidateId, generatedBy, data, }: {
        templateId: string;
        offerId?: string;
        candidateId: string;
        generatedBy?: string;
        data: Record<string, any>;
    }): Promise<Buffer<ArrayBufferLike>>;
    uploadSignedOffer(signedFile: {
        name: string;
        type: string;
        base64: string;
    }, candidateFullName: string, candidateId: string): Promise<string>;
    private htmlToPdf;
}
