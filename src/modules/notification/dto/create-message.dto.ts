import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }) // allows localhost
  website?: string;

  @IsString()
  @MaxLength(5000)
  message: string;
}
