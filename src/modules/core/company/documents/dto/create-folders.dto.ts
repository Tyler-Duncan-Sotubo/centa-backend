import {
  IsString,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateDocumentFoldersDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsBoolean()
  permissionControlled?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  officeIds?: string[];
}
