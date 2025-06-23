import {
  IsIn,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateHistoryDto {
  @IsIn(['employment', 'education', 'certification']) type: string;
  @IsString() @IsNotEmpty() title: string;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() endDate?: string;
  @IsString() @IsOptional() institution?: string;
  @IsString() @IsOptional() description?: string;
}
