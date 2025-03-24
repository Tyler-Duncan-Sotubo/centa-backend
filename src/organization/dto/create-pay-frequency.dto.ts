import { IsString, IsNotEmpty } from 'class-validator';

// DTO for creating a pay frequency
export class CreatePayFrequencyDto {
  @IsString()
  @IsNotEmpty()
  pay_frequency: string; // The pay frequency of the company

  @IsString()
  @IsNotEmpty()
  startDate: string; // The start date of the pay frequency

  @IsString()
  @IsNotEmpty()
  weekendAdjustment: 'friday' | 'monday' | 'none';

  @IsString()
  @IsNotEmpty()
  holidayAdjustment: 'previous' | 'next' | 'none';

  @IsString()
  @IsNotEmpty()
  countryCode: string;
}
