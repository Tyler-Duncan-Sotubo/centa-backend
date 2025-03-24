import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateEmployeeGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  pay_schedule_id: string;

  @IsBoolean()
  @IsOptional()
  apply_paye: boolean;

  @IsBoolean()
  @IsOptional()
  apply_pension: boolean;

  @IsBoolean()
  @IsOptional()
  apply_nhf: boolean;

  @IsBoolean()
  @IsOptional()
  apply_additional: boolean;

  @IsOptional()
  employees: string[];
}
