import { IsInt, Min, Max, IsOptional, IsString, Length } from 'class-validator';

export class AddGoalProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}
