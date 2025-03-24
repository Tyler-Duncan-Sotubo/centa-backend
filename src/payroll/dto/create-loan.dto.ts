import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// DTO for Loan Request
export class LoanRequestDto {
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

// DTO for Updating Loan Status
export class UpdateLoanStatusDto {
  @IsNotEmpty()
  @IsString()
  status: string;

  @IsNotEmpty()
  @IsOptional()
  reason: string;
}
