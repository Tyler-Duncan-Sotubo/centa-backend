import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
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
  @ValidateNested()
  @Type(() => FileDto)
  file: FileDto;

  @IsString()
  @IsNotEmpty({ message: 'Comment is required' })
  comment: string;
}
