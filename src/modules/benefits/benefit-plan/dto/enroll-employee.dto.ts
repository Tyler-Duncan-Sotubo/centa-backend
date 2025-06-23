import { IsUUID, IsArray, IsString, IsNotEmpty } from 'class-validator';

export class EnrollBenefitPlanDto {
  @IsUUID()
  benefitPlanId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds: string[];

  @IsString()
  @IsNotEmpty()
  selectedCoverage: string;
}
