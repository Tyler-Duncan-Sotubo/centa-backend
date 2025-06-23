import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateAssetDto {
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

  @IsDateString(
    {},
    { message: 'Purchase date is required and must be a valid date' },
  )
  purchaseDate: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  // Assignment
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Location is required' })
  locationId: string;

  @IsOptional()
  @IsDateString()
  lendDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;
}
