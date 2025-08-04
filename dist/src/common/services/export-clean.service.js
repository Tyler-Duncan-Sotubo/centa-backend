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
var ExportCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const fs = require("fs");
const path = require("path");
let ExportCleanupService = ExportCleanupService_1 = class ExportCleanupService {
    constructor() {
        this.logger = new common_1.Logger(ExportCleanupService_1.name);
        this.EXPORTS_DIR = path.resolve(process.cwd(), 'exports');
        this.TEMP_DIR = path.resolve(process.cwd(), 'src/temp');
        this.MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000;
    }
    handleExportFileCleanup() {
        const now = Date.now();
        try {
            if (!fs.existsSync(this.EXPORTS_DIR)) {
                this.logger.warn('Exports directory does not exist.');
                return;
            }
            const files = fs.readdirSync(this.EXPORTS_DIR);
            files.forEach((file) => {
                const filePath = path.join(this.EXPORTS_DIR, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;
                if (age > this.MAX_FILE_AGE_MS) {
                    fs.unlinkSync(filePath);
                    this.logger.log(`Deleted export: ${file}`);
                }
            });
        }
        catch (error) {
            this.logger.error('Error during export cleanup:', error);
        }
    }
    handleTempFileCleanup() {
        const now = Date.now();
        try {
            if (!fs.existsSync(this.TEMP_DIR)) {
                this.logger.warn('Temp directory does not exist.');
                return;
            }
            const items = fs.readdirSync(this.TEMP_DIR);
            items.forEach((item) => {
                const itemPath = path.join(this.TEMP_DIR, item);
                const stats = fs.statSync(itemPath);
                const age = now - stats.mtimeMs;
                if (age > this.MAX_FILE_AGE_MS) {
                    if (stats.isFile()) {
                        fs.unlinkSync(itemPath);
                        this.logger.log(`Deleted temp file: ${item}`);
                    }
                    else if (stats.isDirectory()) {
                        fs.rmSync(itemPath, { recursive: true, force: true });
                        this.logger.log(`Deleted temp folder: ${item}`);
                    }
                }
            });
        }
        catch (error) {
            this.logger.error('Error during temp cleanup:', error);
        }
    }
};
exports.ExportCleanupService = ExportCleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_WEEKEND),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExportCleanupService.prototype, "handleExportFileCleanup", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_WEEKEND),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExportCleanupService.prototype, "handleTempFileCleanup", null);
exports.ExportCleanupService = ExportCleanupService = ExportCleanupService_1 = __decorate([
    (0, common_1.Injectable)()
], ExportCleanupService);
//# sourceMappingURL=export-clean.service.js.map