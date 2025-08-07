import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OffboardingChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAssetReturnStep?: boolean;
}
