import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateDependentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() relationship: string;
  @IsDateString() @IsNotEmpty() dateOfBirth: string;
  @IsBoolean() @IsOptional() isBeneficiary?: boolean;
}
