import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, ValidateNested, IsUUID } from 'class-validator';

class DocumentFileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  base64: string;
}

export class CreateDocumentDto {
  @IsUUID()
  folderId: string;

  @IsString()
  @IsNotEmpty()
  type: string; // e.g. "contract", "payroll"

  @IsString()
  @IsNotEmpty()
  category: string; // e.g. "uploads", "docs"

  @ValidateNested()
  @Type(() => DocumentFileDto)
  file: DocumentFileDto;
}
