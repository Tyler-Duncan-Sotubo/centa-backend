import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateBenefitGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  rules: Record<string, any>;
}
