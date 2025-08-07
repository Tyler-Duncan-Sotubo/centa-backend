// dto/create-offboarding-begin.dto.ts
import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOffboardingBeginDto {
  @IsUUID()
  employeeId!: string;

  @IsString()
  terminationType!: string;

  @IsString()
  terminationReason!: string;

  // store as ISO string or yyy-mm-dd (you chose varchar)
  @IsString()
  terminationDate!: string;

  @IsBoolean()
  @IsOptional()
  eligibleForRehire?: boolean; // defaults true
}
