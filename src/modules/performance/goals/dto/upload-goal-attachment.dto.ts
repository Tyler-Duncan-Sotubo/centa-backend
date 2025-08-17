import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class FileDto {
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Base64 data is required' })
  base64: string;
}

export class UploadGoalAttachmentDto {
  @IsOptional()
  @IsUUID()
  objectiveId?: string | null;

  @IsOptional()
  @IsUUID()
  keyResultId?: string | null;

  @ValidateNested()
  @Type(() => FileDto)
  file: FileDto;

  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  comment: string;
}
