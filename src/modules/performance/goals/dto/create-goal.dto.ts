import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  status: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  dueDate: string;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsUUID()
  employeeId: string;
}
