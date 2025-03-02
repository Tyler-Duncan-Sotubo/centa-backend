import { Injectable, Inject } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as stringify from 'csv-stringify/sync'; // CSV generator
import { company_files } from 'src/drizzle/schema/company.schema';
import { db } from '../../drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import { eq } from 'drizzle-orm';

@Injectable()
export class AwsService {
  private s3Client = new S3Client({
    region: this.configService.get('AWS_REGION'),
  });

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  async uploadFile(
    filePath: string,
    fileName: string,
    companyId: string,
    type: string,
    category: string,
  ): Promise<string> {
    const fileContent = fs.readFileSync(filePath);

    const bucket = this.configService.get('AWS_BUCKET_NAME');
    const region = this.configService.get('AWS_REGION');
    const s3Key = `payrolls/${companyId}/${fileName}`;
    const name = `payrolls_${companyId}_${fileName}.csv`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: 'text/csv',
        ACL: 'public-read',
      }),
    ); /// Upload to S3

    const existingCSV = await this.db
      .select()
      .from(company_files)
      .where(eq(company_files.name, name))
      .execute();

    if (existingCSV.length > 0) {
      return existingCSV[0].url;
    } else {
      await this.db
        .insert(company_files)
        .values({
          name,
          url: `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`,
          company_id: companyId,
          type,
          category,
        })
        .returning()
        .execute();

      return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    }
  }

  async uploadCsvToS3(companyId: string, employees: any[]): Promise<any> {
    const csvData = stringify.stringify(employees, {
      header: true,
      columns: {
        employee_number: 'Employee Number',
        first_name: 'First Name',
        last_name: 'Last Name',
        job_title: 'Job Title',
        email: 'Email',
        phone: 'Phone',
        employment_status: 'Employment Status',
        start_date: 'Start Date',
        company_id: 'Company ID',
        department_id: 'Department ID',
        is_active: 'Is Active',
        annual_gross: 'Annual Gross',
        hourly_rate: 'Hourly Rate',
        bonus: 'Bonus',
        commission: 'Commission',
      },
    });

    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const fileName = `employees_${companyId}_${timestamp}.csv`;
    const tempDir = path.join(__dirname, '../../temp');
    const tempFilePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    await promisify(fs.mkdir)(tempDir, { recursive: true });

    // Write CSV to a temporary file
    await promisify(fs.writeFile)(tempFilePath, csvData);

    const date = new Date();
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    try {
      const bucket = this.configService.get('AWS_BUCKET_NAME');
      const region = this.configService.get('AWS_REGION');
      const s3Key = `company-employees/${companyId}/${fileName}`;
      const name = `Employees_${companyId}_${dateString}.csv`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: fs.createReadStream(tempFilePath),
          ContentType: 'text/csv',
          ACL: 'public-read',
        }),
      ); /// Upload to S3

      const fileRecord = await this.db
        .insert(company_files)
        .values({
          name,
          url: `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`,
          company_id: companyId,
          type: 'employee_upload',
          category: 'uploads',
        })
        .returning()
        .execute();

      return fileRecord[0]; // Return full metadata from the database
    } catch (error) {
      console.error('Error during S3 upload or database operation:', error);
      throw new Error('Failed to upload and save CSV file');
    } finally {
      await promisify(fs.unlink)(tempFilePath).catch((err) => {
        console.error('Error deleting temporary file:', err);
      });
    }
  }

  async uploadImageToS3(email: string, fileName: string, image: any) {
    const base64Data = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );

    const contentType = image.startsWith('data:image/png')
      ? 'image/png'
      : 'image/jpeg';

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: `${email}/${fileName}`,
        Body: base64Data,
        ContentEncoding: 'base64',
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );

    return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`; //
  }

  async uploadPdfToS3(email: string, fileName: string, pdfBuffer: Buffer) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: `${email}/${fileName}`,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ACL: 'public-read',
      }),
    );

    return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // Link valid for 5 minutes
  }
}
