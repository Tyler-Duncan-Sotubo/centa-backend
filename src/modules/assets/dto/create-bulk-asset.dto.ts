import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

export class CreateBulkAssetDto {
  // Specification
  @IsString()
  @IsNotEmpty({ message: 'Asset name is required' })
  name: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  specs?: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsString()
  @IsNotEmpty({ message: 'Serial number is required' })
  serialNumber: string;

  // Value
  @IsString()
  purchasePrice: string;

  @IsDateString({}, { message: 'Purchase date must be a valid date' })
  purchaseDate: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  // Assignment
  @IsOptional()
  @IsDateString()
  lendDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;
}
