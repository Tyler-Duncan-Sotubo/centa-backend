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
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
const stringify = require("csv-stringify/sync");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
let AwsService = class AwsService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
        this.s3Client = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
        });
    }
    async uploadFile(filePath, fileName, companyId, type, category) {
        const fileContent = fs.readFileSync(filePath);
        const bucket = this.configService.get('AWS_BUCKET_NAME');
        const region = this.configService.get('AWS_REGION');
        const s3Key = `payrolls/${companyId}/${fileName}`;
        const name = `payrolls_${companyId}_${fileName}.csv`;
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'text/csv',
            ACL: 'public-read',
        }));
        const existingCSV = await this.db
            .select()
            .from(company_schema_1.company_files)
            .where((0, drizzle_orm_1.eq)(company_schema_1.company_files.name, name))
            .execute();
        if (existingCSV.length > 0) {
            return existingCSV[0].url;
        }
        else {
            await this.db
                .insert(company_schema_1.company_files)
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
    async uploadCsvToS3(companyId, employees) {
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
        await (0, util_1.promisify)(fs.mkdir)(tempDir, { recursive: true });
        await (0, util_1.promisify)(fs.writeFile)(tempFilePath, csvData);
        const date = new Date();
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        try {
            const bucket = this.configService.get('AWS_BUCKET_NAME');
            const region = this.configService.get('AWS_REGION');
            const s3Key = `company-employees/${companyId}/${fileName}`;
            const name = `Employees_${companyId}_${dateString}.csv`;
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: s3Key,
                Body: fs.createReadStream(tempFilePath),
                ContentType: 'text/csv',
                ACL: 'public-read',
            }));
            const fileRecord = await this.db
                .insert(company_schema_1.company_files)
                .values({
                name,
                url: `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`,
                company_id: companyId,
                type: 'employee_upload',
                category: 'uploads',
            })
                .returning()
                .execute();
            return fileRecord[0];
        }
        catch (error) {
            console.error('Error during S3 upload or database operation:', error);
            throw new Error('Failed to upload and save CSV file');
        }
        finally {
            await (0, util_1.promisify)(fs.unlink)(tempFilePath).catch((err) => {
                console.error('Error deleting temporary file:', err);
            });
        }
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