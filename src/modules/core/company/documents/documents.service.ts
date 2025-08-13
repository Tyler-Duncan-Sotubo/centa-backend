import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { companyFiles } from './schema/company-files.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly s3Service: S3StorageService,
  ) {}

  async uploadDocument(dto: CreateDocumentDto, user: User) {
    const { file, folderId, type, category } = dto;
    const { id: userId, companyId } = user;

    const [meta, base64Data] = file.base64.split(',');
    const mimeMatch = meta.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];

    if (!mimeType || !base64Data) {
      throw new BadRequestException('Invalid file format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `company-files/${companyId}/${folderId}/${Date.now()}-${file.name}`;

    const { url, record } = await this.s3Service.uploadBuffer(
      buffer,
      key,
      companyId,
      type,
      category,
      mimeType,
    );

    await this.db
      .update(companyFiles)
      .set({ folderId, uploadedBy: userId, name: file.name })
      .where(eq(companyFiles.id, record.id))
      .execute();

    // Log the upload action
    await this.audit.logAction({
      action: 'upload',
      entity: 'document',
      entityId: record.id,
      userId,
      details: 'Uploaded document',
      changes: {
        folderId,
        type,
        category,
        name: file.name,
        url,
      },
    });

    return {
      id: record.id,
      name: record.name,
      url,
    };
  }

  async deleteCompanyFile(
    fileId: string,
    user: User,
  ): Promise<{ success: boolean }> {
    const { id: userId, companyId } = user;
    const [file] = await this.db
      .select()
      .from(companyFiles)
      .where(eq(companyFiles.id, fileId));

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Step 1: Delete from S3
    await this.s3Service.deleteFileFromS3(file.url);

    // Step 2: Remove from DB
    await this.db
      .delete(companyFiles)
      .where(eq(companyFiles.id, fileId))
      .execute();

    // Step 3: Log the deletion
    await this.audit.logAction({
      action: 'delete',
      entity: 'document',
      entityId: fileId,
      userId,
      details: 'Deleted document',
      changes: {
        name: file.name,
        url: file.url,
      },
    });

    return { success: true };
  }
}
