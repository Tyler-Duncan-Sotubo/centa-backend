import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBlockedDayDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
