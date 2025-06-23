import { IsOptional, IsString } from 'class-validator';

export class ApproveRejectLeaveDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
