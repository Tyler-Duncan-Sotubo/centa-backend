import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateJobRoleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
