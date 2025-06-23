import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSalaryAdvanceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  tenureMonths: number;

  @IsOptional()
  preferredMonthlyPayment: number;
}

export class UpdateLoanStatusDto {
  @IsNotEmpty()
  @IsString()
  status: string;

  @IsNotEmpty()
  @IsOptional()
  reason: string;
}
