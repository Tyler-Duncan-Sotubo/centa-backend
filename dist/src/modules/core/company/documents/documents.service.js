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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const s3_storage_service_1 = require("../../../../common/aws/s3-storage.service");
const company_files_schema_1 = require("./schema/company-files.schema");
let DocumentsService = class DocumentsService {
    constructor(db, audit, s3Service) {
        this.db = db;
        this.audit = audit;
        this.s3Service = s3Service;
    }
    async uploadDocument(dto, user) {
        const { file, folderId, type, category } = dto;
        const { id: userId, companyId } = user;
        const [meta, base64Data] = file.base64.split(',');
        const mimeMatch = meta.match(/data:(.*);base64/);
        const mimeType = mimeMatch?.[1];
        if (!mimeType || !base64Data) {
            throw new common_1.BadRequestException('Invalid file format');
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `company-files/${companyId}/${folderId}/${Date.now()}-${file.name}`;
        const { url, record } = await this.s3Service.uploadBuffer(buffer, key, companyId, type, category, mimeType);
        await this.db
            .update(company_files_schema_1.companyFiles)
            .set({ folderId, uploadedBy: userId, name: file.name })
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.id, record.id))
            .execute();
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
    async deleteCompanyFile(fileId, user) {
        const { id: userId, companyId } = user;
        const [file] = await this.db
            .select()
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.id, fileId));
        if (!file) {
            throw new common_1.NotFoundException('File not found');
        }
        if (file.companyId !== companyId) {
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
        return { success: true };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        s3_storage_service_1.S3StorageService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map