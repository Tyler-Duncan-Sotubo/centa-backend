import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBenefitGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUUID()
  teamId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  rules: Record<string, any>;
}
