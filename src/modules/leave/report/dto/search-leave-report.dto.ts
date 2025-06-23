import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SearchLeaveReportsDto {
  @IsOptional()
  year?: number;

  @IsString()
  @IsNotEmpty()
  groupBy: 'month' | 'year' | 'leaveType';
}
