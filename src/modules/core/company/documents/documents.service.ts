import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { companyFiles } from './schema/company-files.schema';
import { CreateDocumentDto } from './dto/create-document.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly s3Service: S3StorageService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(DocumentsService.name);
  }

  // ---------- cache keys (aligned with DocumentsFolderService) ----------
  private foldersListKey(companyId: string) {
    return `doc:folders:${companyId}:list`;
  }
  private async burstFolderLists(companyId: string) {
    await this.cache.del(this.foldersListKey(companyId));
    this.logger.debug({ companyId }, 'documents:cache:burst:foldersList');
  }

  async uploadDocument(dto: CreateDocumentDto, user: User) {
    const { file, folderId, type, category } = dto;
    const { id: userId, companyId } = user;

    this.logger.info(
      { companyId, userId, folderId, type, category, name: file?.name },
      'documents:upload:start',
    );

    // Basic validation for file payload
    if (!file?.base64 || !file?.name) {
      this.logger.warn(
        { companyId, folderId },
        'documents:upload:missing-file',
      );
      throw new BadRequestException('File payload is missing.');
    }

    const [meta, base64Data] = file.base64.split(',');
    const mimeMatch = meta?.match(/data:(.*);base64/);
    const mimeType = mimeMatch?.[1];

    if (!mimeType || !base64Data) {
      this.logger.warn({ companyId, folderId }, 'documents:upload:bad-mime');
      throw new BadRequestException('Invalid file format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const key = `company-files/${companyId}/${folderId}/${Date.now()}-${file.name}`;

    // Upload to S3 (also creates DB record via storage service)
    const { url, record } = await this.s3Service.uploadBuffer(
      buffer,
      key,
      companyId,
      type,
      category,
      mimeType,
    );

    // Persist linkage to folder + uploader in our files table
    const [updated] = await this.db
      .update(companyFiles)
      .set({
        folderId,
        uploadedBy: userId,
        name: file.name,
      })
      .where(eq(companyFiles.id, record.id))
      .returning();

    // Audit
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

    // Burst folder list cache so folder contents refresh in UI
    await this.burstFolderLists(companyId);

    this.logger.info(
      { id: record.id, companyId, folderId, name: file.name },
      'documents:upload:done',
    );

    return {
      id: record.id,
      name: updated?.name ?? file.name,
      url,
    };
  }

  async deleteCompanyFile(
    fileId: string,
    user: User,
  ): Promise<{ success: boolean }> {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, userId, fileId }, 'documents:delete:start');

    const [file] = await this.db
      .select()
      .from(companyFiles)
      .where(eq(companyFiles.id, fileId));

    if (!file) {
      this.logger.warn({ fileId }, 'documents:delete:not-found');
      throw new NotFoundException('File not found');
    }

    if (file.companyId !== companyId) {
      this.logger.warn(
        { fileId, fileCompanyId: file.companyId, userCompanyId: companyId },
        'documents:delete:forbidden',
      );
      throw new ForbiddenException('Access denied');
    }

    // 1) Delete from S3
    await this.s3Service.deleteFileFromS3(file.url);

    // 2) Remove from DB
    await this.db
      .delete(companyFiles)
      .where(eq(companyFiles.id, fileId))
      .execute();

    // 3) Audit
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

    // 4) Burst folder list cache
    await this.burstFolderLists(companyId);

    this.logger.info({ fileId }, 'documents:delete:done');
    return { success: true };
  }
}
