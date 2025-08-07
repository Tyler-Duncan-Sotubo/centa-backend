import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOffboardingConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
