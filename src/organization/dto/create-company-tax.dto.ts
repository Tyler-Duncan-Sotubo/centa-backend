import { IsString, IsOptional } from 'class-validator';

// DTO for creating a company
export class CreateCompanyTaxDto {
  @IsString()
  @IsOptional()
  tin: string; // The name of the company contact

  @IsString()
  @IsOptional()
  vat_number: string; // The position of the company contact

  @IsString()
  @IsOptional()
  nhf_code: string; // The email of the company contact

  @IsString()
  @IsOptional()
  pension_code: string; // The phone number of the company contact
}
