import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentFoldersDto } from './create-folders.dto';

export class UpdateDocumentFoldersDto extends PartialType(
  CreateDocumentFoldersDto,
) {}
