import { IsString, IsNotEmpty, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class SignedFileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  base64: string;
}

export class SignOfferDto {
  @IsUUID()
  @IsNotEmpty()
  offerId: string;

  @IsUUID()
  @IsNotEmpty()
  candidateId: string;

  @ValidateNested()
  @Type(() => SignedFileDto)
  signedFile: SignedFileDto;

  @IsString()
  @IsNotEmpty()
  candidateFullName: string;
}
