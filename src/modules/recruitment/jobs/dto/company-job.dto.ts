import { IsOptional, IsString } from 'class-validator';

export class CompanyJobsDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
