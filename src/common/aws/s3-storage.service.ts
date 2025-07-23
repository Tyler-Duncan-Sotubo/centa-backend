// src/common/services/s3-storage.service.ts
import { Injectable, Inject } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, eq } from 'drizzle-orm';
import { companyFiles } from 'src/modules/core/company/documents/schema/company-files.schema';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { companyFileFolders } from 'src/drizzle/schema';

@Injectable()
export class S3StorageService {
  private readonly s3: S3Client;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {
    this.s3 = new S3Client({
      region: this.configService.get('AWS_REGION'),
    });
  }

  async ensureReportsFolder(companyId: string): Promise<string> {
    const existing = await this.db
      .select()
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, 'Reports'),
          eq(companyFileFolders.isSystem, true),
        ),
      );

    if (existing.length > 0) {
      return existing[0].id;
    }

    const [created] = await this.db
      .insert(companyFileFolders)
      .values({
        companyId,
        name: 'Reports',
        isSystem: true,
      })
      .returning({ id: companyFileFolders.id });

    return created.id;
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    companyId: string,
    type: string,
    category: string,
    mimeType: string,
    reportsFolderId?: string,
  ): Promise<{ url: string; record: any }> {
    const bucket = this.configService.get('AWS_BUCKET_NAME');

    // Step 1: Upload file to S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    const fileUrl = `https://${bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
    const filename = path.basename(key);

    try {
      // Step 2: Try saving to database
      const [record] = await this.db
        .insert(companyFiles)
        .values({
          companyId,
          name: filename,
          url: fileUrl,
          type,
          category,
          folderId: reportsFolderId || null,
        })
        .returning()
        .execute();

      return { url: fileUrl, record };
    } catch (err) {
      console.error('Failed to save company file to database:', err);

      // Step 3: Cleanup uploaded file if database insert fails
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      throw new Error('Upload rolled back because database insert failed.');
    }
  }

  async uploadFilePath(
    filePath: string,
    companyId: string,
    type: string,
    category: string,
  ): Promise<{ url: string; record: any }> {
    const fileBuffer = await promisify(fs.readFile)(filePath);
    const fileName = path.basename(filePath);

    const reportsFolderId = await this.ensureReportsFolder(companyId);

    const key = `company-files/${companyId}/${reportsFolderId}/${fileName}`;
    const mimeType = this.getMimeType(fileName);

    return this.uploadBuffer(
      fileBuffer,
      key,
      companyId,
      type,
      category,
      mimeType,
      reportsFolderId,
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const bucket = this.configService.get('AWS_BUCKET_NAME');
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });

    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async deleteFileFromS3(fileUrl: string): Promise<void> {
    const bucket = this.configService.get('AWS_BUCKET_NAME');
    const key = this.extractKeyFromUrl(fileUrl);

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private extractKeyFromUrl(fileUrl: string): string {
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid S3 URL format');
    }
    return urlParts[1]; // everything after ".amazonaws.com/"
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.csv':
        return 'text/csv';
      case '.xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.pdf':
        return 'application/pdf';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }
}
