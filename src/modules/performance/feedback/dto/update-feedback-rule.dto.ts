import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeedbackRuleScopeDto {
  @IsOptional()
  @IsBoolean()
  officeOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  departmentOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offices?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];
}

export class UpdateFeedbackRuleDto {
  @IsIn(['employee', 'manager'])
  group: 'employee' | 'manager';

  @IsIn(['self', 'peer', 'manager_to_employee', 'employee_to_manager'])
  type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackRuleScopeDto)
  scope?: FeedbackRuleScopeDto;
}
