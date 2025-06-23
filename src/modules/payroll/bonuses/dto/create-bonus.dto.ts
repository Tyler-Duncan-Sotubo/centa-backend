import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBonusDto {
  @IsString()
  @IsNotEmpty()
  bonusType: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  effectiveDate: string;
}
