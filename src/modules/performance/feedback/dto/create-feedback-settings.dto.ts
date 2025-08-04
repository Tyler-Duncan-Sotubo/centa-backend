import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScopeDto {
  @IsOptional()
  @IsBoolean()
  officeOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  departmentOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  offices?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  departments?: string[];
}

export class RuleDto {
  @IsEnum(['employee', 'manager'])
  group: 'employee' | 'manager';

  @IsEnum(['self', 'peer', 'manager_to_employee', 'employee_to_manager'])
  type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager';

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScopeDto)
  scope?: ScopeDto;
}

export class CreateFeedbackSettingsDto {
  @IsBoolean()
  enableEmployeeFeedback: boolean;

  @IsBoolean()
  enableManagerFeedback: boolean;

  @IsBoolean()
  allowAnonymous: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleDto)
  rules: RuleDto[];
}
