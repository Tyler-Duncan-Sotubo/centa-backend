import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateAllowanceDto {
  @IsUUID()
  payGroupId!: string;

  @IsString()
  allowanceType!: string;

  @IsIn(['percentage', 'fixed'])
  valueType!: 'percentage' | 'fixed';

  @IsOptional()
  @IsString()
  percentage?: string; // e.g. 30 for 30%

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number; // in Kobo, e.g. 50000}
}
