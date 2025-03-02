import { IsBoolean, IsOptional } from 'class-validator';

// DTO for creating a company
export class CustomTaxSettingsDto {
  @IsBoolean()
  @IsOptional()
  itf: boolean;

  @IsBoolean()
  @IsOptional()
  nhf: boolean;

  @IsBoolean()
  @IsOptional()
  nhis: boolean;

  @IsBoolean()
  @IsOptional()
  nsitf: boolean;

  @IsBoolean()
  @IsOptional()
  paye: boolean;

  @IsBoolean()
  @IsOptional()
  pension: boolean;
}
