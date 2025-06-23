import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreatePayGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  payScheduleId: string;

  @IsBoolean()
  @IsOptional()
  applyPaye: boolean;

  @IsBoolean()
  @IsOptional()
  applyPension: boolean;

  @IsBoolean()
  @IsOptional()
  applyNhf: boolean;

  @IsOptional()
  employees: string[];
}
