import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAssessmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goalsComment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  attendanceComment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedbackComment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  questionnaireComment?: string;
}
