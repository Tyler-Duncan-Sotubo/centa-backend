import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

// DTO for creating a company
export class CreateCustomDeduction {
  @IsString()
  @IsNotEmpty()
  deduction_name: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  employee_id: string;
}
