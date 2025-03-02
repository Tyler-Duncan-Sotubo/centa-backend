import { IsBoolean, IsOptional } from 'class-validator';

// DTO for creating a company
export class updateTaxConfigurationDto {
  @IsBoolean()
  @IsOptional()
  apply_paye?: boolean;

  @IsBoolean()
  @IsOptional()
  apply_pension?: boolean;

  @IsBoolean()
  @IsOptional()
  apply_nhf?: boolean;
}
