import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';

enum InterviewStage {
  PHONE_SCREEN = 'phone_screen',
  TECHNICAL = 'tech',
  ONSITE = 'onsite',
  FINAL = 'final',
}

export class ScheduleInterviewDto {
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @IsEnum(InterviewStage)
  stage: InterviewStage;

  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;

  @IsNumber()
  @Min(1)
  durationMins: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  interviewerIds: string[];

  @IsUUID()
  @IsNotEmpty()
  scorecardTemplateId: string;

  @IsUUID()
  emailTemplateId?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  eventId?: string; // Optional field for Google Calendar integration
}
