import { IsString, IsNotEmpty } from 'class-validator';

export class CreateEmployeeBankDetailsDto {
  @IsString()
  @IsNotEmpty()
  bank_account_number: string;

  @IsString()
  @IsNotEmpty()
  bank_account_name: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;
}
