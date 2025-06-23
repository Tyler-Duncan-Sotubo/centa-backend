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
exports.S3StorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const company_files_schema_1 = require("../../modules/core/company/schema/company-files.schema");
const path = require("path");
const fs = require("fs");
const util_1 = require("util");
let S3StorageService = class S3StorageService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
        this.s3 = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
        });
    }
    async uploadBuffer(buffer, key, companyId, type, category, mimeType) {
        const bucket = this.configService.get('AWS_BUCKET_NAME');
        await this.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read',
        }));
        const fileUrl = `https://${bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
        const filename = path.basename(key);
        try {
            const [record] = await this.db
                .insert(company_files_schema_1.companyFiles)
                .values({
                companyId,
                name: filename,
                url: fileUrl,
                type,
                category,
            })
                .returning()
                .execute();
            return { url: fileUrl, record };
        }
        catch (err) {
            console.error('Failed to save company file to database:', err);
            await this.s3.send(new client_s3_1.DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            throw new Error('Upload rolled back because database insert failed.');
        }
    }
    async uploadFilePath(filePath, companyId, type, category) {
        const fileBuffer = await (0, util_1.promisify)(fs.readFile)(filePath);
        const fileName = path.basename(filePath);
        const key = `company-uploads/${companyId}/${fileName}`;
        const mimeType = this.getMimeType(fileName);
        return this.uploadBuffer(fileBuffer, key, companyId, type, category, mimeType);
    }
    async getSignedUrl(key, expiresInSeconds = 300) {
        const bucket = this.configService.get('AWS_BUCKET_NAME');
        const command = new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3, command, { expiresIn: expiresInSeconds });
    }
    getMimeType(fileName) {
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
};
exports.S3StorageService = S3StorageService;
exports.S3StorageService = S3StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], S3StorageService);
//# sourceMappingURL=s3-storage.service.js.map