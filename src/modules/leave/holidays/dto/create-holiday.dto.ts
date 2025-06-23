import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  @Length(1, 100)
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  year: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5)
  countryCode?: string;
}
