import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsOptional()
  link?: string;

  @IsOptional()
  image?: string; // URL or path to the image

  @IsString()
  body: string;

  @IsOptional()
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;
}
