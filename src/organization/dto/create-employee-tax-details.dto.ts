import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class CreateEmployeeTaxDetailsDto {
  @IsString()
  @IsNotEmpty()
  tin: string;

  @IsString()
  @IsNotEmpty()
  state_of_residence: string;

  @IsNumber()
  @IsOptional()
  consolidated_relief_allowance: number;

  @IsNumber()
  @IsOptional()
  other_reliefs: number;

  @IsBoolean()
  @IsOptional()
  has_exemptions: boolean;

  @IsString()
  @IsOptional()
  additional_details: string;
}
