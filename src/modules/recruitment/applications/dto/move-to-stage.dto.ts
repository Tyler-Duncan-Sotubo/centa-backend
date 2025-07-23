import { IsUUID, IsOptional, IsString } from 'class-validator';

export class MoveToStageDto {
  @IsUUID()
  applicationId: string;

  @IsUUID()
  newStageId: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
