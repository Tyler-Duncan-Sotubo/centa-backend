// dto/public-jobs.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsIn,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PublicJobsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsIn(['onsite', 'remote', 'hybrid'], { each: true })
  jobType?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsIn(
    [
      'permanent',
      'temporary',
      'contract',
      'internship',
      'freelance',
      'part_time',
      'full_time',
    ],
    { each: true },
  )
  employmentType?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true }) // optionally use @IsIn([...]) for fixed experience levels
  experienceLevel?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @IsIn(['draft', 'open', 'closed', 'archived'])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsIn(['title', 'createdAt', 'deadlineDate'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
