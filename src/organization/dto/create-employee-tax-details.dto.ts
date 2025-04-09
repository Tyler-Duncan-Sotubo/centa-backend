import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateEmployeeTaxDetailsDto {
  @IsString()
  @IsNotEmpty()
  tin: string;

  @IsString()
  @IsOptional()
  pension_pin: string;

  @IsString()
  @IsOptional()
  nhf_number: string;

  @IsString()
  @IsNotEmpty()
  state_of_residence: string;

  @IsNumber()
  @IsOptional()
  consolidated_relief_allowance: number;
}
