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
exports.AwsService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
let AwsService = class AwsService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
        this.s3Client = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
        });
    }
    async uploadImageToS3(email, fileName, image) {
        const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const contentType = image.startsWith('data:image/png')
            ? 'image/png'
            : 'image/jpeg';
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.configService.get('AWS_BUCKET_NAME'),
            Key: `${email}/${fileName}`,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: contentType,
            ACL: 'public-read',
        }));
        return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`;
    }
    async uploadPdfToS3(email, fileName, pdfBuffer) {
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.configService.get('AWS_BUCKET_NAME'),
            Key: `${email}/${fileName}`,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            ACL: 'public-read',
        }));
        return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`;
    }
    async getSignedUrl(key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.configService.get('AWS_BUCKET_NAME'),
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn: 300 });
    }
};
exports.AwsService = AwsService;
exports.AwsService = AwsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], AwsService);
//# sourceMappingURL=aws.service.js.map