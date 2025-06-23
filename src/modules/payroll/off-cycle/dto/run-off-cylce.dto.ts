import { IsString } from 'class-validator';

export class PayrollRunDto {
  @IsString()
  payrollDate: string;
}
