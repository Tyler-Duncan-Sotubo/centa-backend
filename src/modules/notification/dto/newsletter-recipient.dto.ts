// src/email/dto/newsletter-recipient.dto.ts
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';

export class SendNewsletterDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NewsletterRecipientDto)
  recipients: NewsletterRecipientDto[];
}

export class NewsletterRecipientDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;
}
