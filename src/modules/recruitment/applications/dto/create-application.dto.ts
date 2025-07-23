import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FieldResponseDto {
  @IsString() label: string;
  @IsString() fieldType: string;
  @IsString() value: string;
}

export class QuestionResponseDto {
  @IsString() question: string;
  @IsString() answer: string;
}

enum CandidateSource {
  CAREER_PAGE = 'career_page',
  JOB_BOARD = 'job_board',
  REFERRAL = 'referral',
  AGENCY = 'agency',
  HEADHUNTER = 'headhunter',
  OTHER = 'other',
}

export enum ApplicationSource {
  CAREER_PAGE = 'career_page',
  LINKEDIN = 'linkedin',
  INDEED = 'indeed',
  REFERRAL = 'referral',
  AGENCY = 'agency',
  INTERNAL = 'internal',
  OTHER = 'other',
}

export class CreateApplicationDto {
  @IsUUID()
  jobId: string;

  @IsEnum(ApplicationSource)
  applicationSource: ApplicationSource;

  @IsEnum(CandidateSource)
  candidateSource: CandidateSource;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldResponseDto)
  fieldResponses: FieldResponseDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionResponseDto)
  questionResponses: QuestionResponseDto[];
}
