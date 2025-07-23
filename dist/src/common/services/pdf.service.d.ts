import { PayslipService } from 'src/modules/payroll/payslip/payslip.service';
import { AwsService } from '../aws/aws.service';
import { db } from 'src/drizzle/types/drizzle';
export declare class PdfService {
    private db;
    private readonly payslipService;
    private readonly awsService;
    private s3;
    private bucketName;
    constructor(db: db, payslipService: PayslipService, awsService: AwsService);
    generatePayslipPdf(payslipId: string): Promise<Buffer>;
    private htmlToPdf;
}
