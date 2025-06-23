import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsDate,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BenefitCategory {
  Health = 'Health',
  Dental = 'Dental',
  Wellness = 'Wellness',
  Perks = 'Perks',
  LifeInsurance = 'Life Insurance',
  DisabilityInsurance = 'Disability Insurance',
  RetirementPlans = 'Retirement Plans',
  CommuterBenefits = 'Commuter Benefits',
  Reimbursement = 'Reimbursement',
}

export enum BenefitSplit {
  EMPLOYEE = 'employee',
  EMPLOYER = 'employer',
  SHARED = 'shared',
}

export class CreateBenefitPlanDto {
  @IsUUID()
  @IsNotEmpty()
  benefitGroupId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(BenefitCategory)
  category: BenefitCategory;

  @IsArray()
  @IsString({ each: true })
  coverageOptions: string[];

  @IsObject()
  cost: Record<string, string>; // can use a stricter nested DTO if needed

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsEnum(BenefitSplit)
  split: BenefitSplit;

  @IsOptional()
  employerContribution?: number;
}
