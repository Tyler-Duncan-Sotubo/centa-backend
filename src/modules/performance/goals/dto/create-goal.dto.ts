import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  ValidateIf,
  IsBoolean,
} from 'class-validator';

export class CreateGoalDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ✅ NEW: allow assigning directly to a cycle
  @IsOptional()
  @IsUUID()
  cycleId?: string;

  // ✅ if cycleId NOT provided -> startDate required
  @ValidateIf((o) => !o.cycleId)
  @IsString()
  @IsOptional()
  startDate?: string;

  // ✅ optional; if omitted, backend will default to cycle end
  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  @IsOptional()
  @IsUUID()
  employeeId?: string | null;

  // ✅ NEW FLAG
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
