// src/google/dto/create-google.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoogleDto {
  @IsEmail()
  googleEmail: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @IsString()
  @IsNotEmpty()
  tokenType: string;

  @IsString()
  @IsNotEmpty()
  scope: string;

  @IsDate()
  @Type(() => Date)
  expiryDate: Date;

  @IsOptional()
  @IsNumber()
  refreshTokenExpiry?: number;
}
