import { IsString, IsNotEmpty, IsOptional, IsDecimal } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// Create DTO for officeLocations
export class CreateOfficeLocationDto {
  @IsString()
  @IsNotEmpty()
  location_name: string; // Name of the office location (e.g., "Headquarters")

  @IsString()
  @IsNotEmpty()
  latitude: string; // Latitude of the office location

  @IsString()
  @IsNotEmpty()
  longitude: string; // Longitude of the office location

  @IsOptional()
  @IsString()
  address: string; // Optional field for address of the office
}

// Update DTO for officeLocations using PartialType
export class UpdateOfficeLocationDto extends PartialType(
  CreateOfficeLocationDto,
) {}

// Create DTO for employeeLocations
export class CreateEmployeeLocationDto {
  @IsString()
  @IsNotEmpty()
  employee_id: string; // ID of the employee

  @IsString()
  @IsNotEmpty()
  location_name: string; // Name of the location (e.g., "Remote - New York", "Office - London")

  @IsDecimal()
  @IsNotEmpty()
  latitude: string; // Latitude of the employee location

  @IsDecimal()
  @IsNotEmpty()
  longitude: string; // Longitude of the employee location

  @IsOptional()
  @IsString()
  address: string; // Optional field for address of the employee location

  // Optional timestamps
  @IsOptional()
  created_at?: string; // Timestamp when the location was added

  @IsOptional()
  updated_at?: string; // Timestamp when the location was last updated
}

// Update DTO for employeeLocations using PartialType
export class UpdateEmployeeLocationDto extends PartialType(
  CreateEmployeeLocationDto,
) {}
