import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateAssetsReportDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  assetId: string;

  @IsString()
  @IsIn(['Lost', 'Damaged', 'Replacement', 'Other'])
  reportType: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
