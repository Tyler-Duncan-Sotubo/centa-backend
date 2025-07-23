import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsFolderService } from './documents-folder.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsFolderService],
})
export class DocumentsModule {}
