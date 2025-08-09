"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const s3_storage_service_1 = require("../../../../common/aws/s3-storage.service");
const company_files_schema_1 = require("./schema/company-files.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    constructor(db, audit, s3Service, logger, cache) {
        this.db = db;
        this.audit = audit;
        this.s3Service = s3Service;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(DocumentsService_1.name);
    }
    foldersListKey(companyId) {
        return `doc:folders:${companyId}:list`;
    }
    async burstFolderLists(companyId) {
        await this.cache.del(this.foldersListKey(companyId));
        this.logger.debug({ companyId }, 'documents:cache:burst:foldersList');
    }
    async uploadDocument(dto, user) {
        const { file, folderId, type, category } = dto;
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, userId, folderId, type, category, name: file?.name }, 'documents:upload:start');
        if (!file?.base64 || !file?.name) {
            this.logger.warn({ companyId, folderId }, 'documents:upload:missing-file');
            throw new common_1.BadRequestException('File payload is missing.');
        }
        const [meta, base64Data] = file.base64.split(',');
        const mimeMatch = meta?.match(/data:(.*);base64/);
        const mimeType = mimeMatch?.[1];
        if (!mimeType || !base64Data) {
            this.logger.warn({ companyId, folderId }, 'documents:upload:bad-mime');
            throw new common_1.BadRequestException('Invalid file format');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `company-files/${companyId}/${folderId}/${Date.now()}-${file.name}`;
        const { url, record } = await this.s3Service.uploadBuffer(buffer, key, companyId, type, category, mimeType);
        const [updated] = await this.db
            .update(company_files_schema_1.companyFiles)
            .set({
            folderId,
            uploadedBy: userId,
            name: file.name,
        })
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.id, record.id))
            .returning();
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
        await this.burstFolderLists(companyId);
        this.logger.info({ id: record.id, companyId, folderId, name: file.name }, 'documents:upload:done');
        return {
            id: record.id,
            name: updated?.name ?? file.name,
            url,
        };
    }
    async deleteCompanyFile(fileId, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, userId, fileId }, 'documents:delete:start');
        const [file] = await this.db
            .select()
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.id, fileId));
        if (!file) {
            this.logger.warn({ fileId }, 'documents:delete:not-found');
            throw new common_1.NotFoundException('File not found');
        }
        if (file.companyId !== companyId) {
            this.logger.warn({ fileId, fileCompanyId: file.companyId, userCompanyId: companyId }, 'documents:delete:forbidden');
            throw new common_1.ForbiddenException('Access denied');
        }
        await this.s3Service.deleteFileFromS3(file.url);
        await this.db
            .delete(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.id, fileId))
            .execute();
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
        await this.burstFolderLists(companyId);
        this.logger.info({ fileId }, 'documents:delete:done');
        return { success: true };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        s3_storage_service_1.S3StorageService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map