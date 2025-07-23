import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateOfferTemplateDto {
  @IsString()
  @Length(3, 100, { message: 'Template name must be at least 3 characters.' })
  name: string;

  @IsString()
  @Length(10, undefined, {
    message: 'Template content must be at least 10 characters.',
  })
  content: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
