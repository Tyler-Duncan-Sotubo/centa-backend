import { IsUUID, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateOffboardingDto {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  @IsOptional()
  terminationType?: string;

  @IsUUID()
  @IsOptional()
  terminationReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  checklistItemIds: string[];
}
