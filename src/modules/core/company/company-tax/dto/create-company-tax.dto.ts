import { IsString, IsOptional } from 'class-validator';

export class CreateCompanyTaxDto {
  @IsOptional()
  @IsString()
  tin: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  nhfCode?: string;

  @IsOptional()
  @IsString()
  pensionCode?: string;
}
