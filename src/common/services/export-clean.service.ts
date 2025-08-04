import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExportCleanupService {
  private readonly logger = new Logger(ExportCleanupService.name);
  private readonly EXPORTS_DIR = path.resolve(process.cwd(), 'exports');
  private readonly TEMP_DIR = path.resolve(process.cwd(), 'src/temp');
  private readonly MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  @Cron(CronExpression.EVERY_WEEKEND)
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
    } catch (error) {
      this.logger.error('Error during export cleanup:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEKEND)
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
          } else if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
            this.logger.log(`Deleted temp folder: ${item}`);
          }
        }
      });
    } catch (error) {
      this.logger.error('Error during temp cleanup:', error);
    }
  }
}
