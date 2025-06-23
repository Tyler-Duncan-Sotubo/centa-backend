import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePayScheduleDto {
  @IsString()
  @IsNotEmpty()
  payFrequency: string; // The pay frequency of the company

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
