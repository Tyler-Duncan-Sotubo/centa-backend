import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  kpiBased?: boolean;

  @IsString()
  dueDate: string;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsUUID()
  cycleId: string;

  @IsUUID('all', { each: true })
  ownerIds: string[];
}
