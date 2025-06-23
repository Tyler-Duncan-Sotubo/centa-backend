import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class AddOrUpdatePayrollOverrideDto {
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
