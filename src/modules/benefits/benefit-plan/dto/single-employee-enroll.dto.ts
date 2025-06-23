import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

export class SingleEnrollBenefitDto {
  @IsUUID()
  @IsNotEmpty()
  benefitPlanId: string;

  @IsString()
  @IsNotEmpty()
  selectedCoverage: string;
}
