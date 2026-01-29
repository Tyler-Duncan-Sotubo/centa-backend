import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export type LocationType = 'OFFICE' | 'HOME' | 'REMOTE';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['OFFICE', 'HOME', 'REMOTE'])
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
