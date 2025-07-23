import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsArray,
  IsNumber,
} from 'class-validator';

export enum JobType {
  ONSITE = 'onsite',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export enum EmploymentType {
  PERMANENT = 'permanent',
  TEMPORARY = 'temporary',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
  PART_TIME = 'part_time',
  FULL_TIME = 'full_time',
}

export class CreateJobDto {
  @IsUUID()
  pipelineTemplateId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  deadlineDate: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsEnum(JobType)
  jobType: JobType;

  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @IsNumber()
  @IsNotEmpty()
  salaryRangeFrom: number;

  @IsNumber()
  @IsNotEmpty()
  salaryRangeTo: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  yearsOfExperience?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  externalJobId?: string;
}
