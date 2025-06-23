import { Injectable, Inject } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';

@Injectable()
export class AwsService {
  private s3Client = new S3Client({
    region: this.configService.get('AWS_REGION'),
  });

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

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
