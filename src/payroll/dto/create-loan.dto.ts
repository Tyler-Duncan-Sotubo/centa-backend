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
  @IsNumber()
  @Min(1)
  amount: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  tenureMonths: number;

  @IsOptional()
  preferredMonthlyPayment: string;
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
