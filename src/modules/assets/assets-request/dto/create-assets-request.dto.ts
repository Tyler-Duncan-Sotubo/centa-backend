import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateAssetsRequestDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  requestDate: string;

  @IsString()
  @IsNotEmpty()
  assetType: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsString()
  @IsIn(['Normal', 'High', 'Critical'])
  urgency: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
