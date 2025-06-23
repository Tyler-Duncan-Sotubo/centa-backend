import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  Length,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateCompensationDto {
  @IsDateString()
  @IsOptional()
  effectiveDate!: string; // ISO 8601 date when this salary takes effect

  @Type(() => Number) // ← coerce to number
  @IsNumber({ maxDecimalPlaces: 2 }) // ← now we’ll get a real number
  grossSalary!: number; // e.g. "500000.00"

  @Length(3, 3)
  @IsOptional()
  @IsIn(['NGN', 'USD', 'EUR', 'GBP', 'KES', 'ZAR'])
  currency?: string = 'NGN';

  @IsNotEmpty()
  @IsOptional()
  @IsIn(['Monthly', 'Biweekly', 'Weekly'])
  payFrequency!: 'Monthly' | 'Biweekly' | 'Weekly';
}
