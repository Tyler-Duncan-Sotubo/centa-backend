import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOffCycleDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumberString({}, { message: 'Amount must be a valid decimal string' })
  amount: string;

  @IsDateString({}, { message: 'Payroll date must be a valid ISO date string' })
  payrollDate: string;

  @IsBoolean()
  @IsOptional()
  taxable?: boolean = true;

  @IsBoolean()
  @IsOptional()
  proratable?: boolean = false;

  @IsString()
  @IsOptional()
  notes?: string;
}
