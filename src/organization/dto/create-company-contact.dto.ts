import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// DTO for creating a company
export class CreateCompanyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string; // The name of the company contact

  @IsString()
  @IsOptional()
  position: string; // The position of the company contact

  @IsString()
  @IsNotEmpty()
  email: string; // The email of the company contact

  @IsString()
  @IsOptional()
  phone: string; // The phone number of the company contact
}
