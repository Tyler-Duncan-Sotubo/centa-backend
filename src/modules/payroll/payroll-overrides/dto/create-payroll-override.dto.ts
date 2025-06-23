import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePayrollOverrideDto {
  @IsUUID('4', { message: 'Please select an employee' })
  employeeId: string;

  @IsDateString()
  payrollDate: string; // Format: 'YYYY-MM-DD'

  @IsOptional()
  @IsBoolean()
  forceInclude?: boolean;

  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
