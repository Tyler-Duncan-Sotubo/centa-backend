import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateLeaveBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  entitlement: string;

  @IsNumber()
  @IsNotEmpty()
  balance: string;
}
