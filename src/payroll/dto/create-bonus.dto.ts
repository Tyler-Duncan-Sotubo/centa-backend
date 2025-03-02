import { IsNumber, IsNotEmpty, IsString } from 'class-validator';

// DTO for creating a company
export class createBonusDto {
  @IsString()
  @IsNotEmpty()
  bonus_type: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  employee_id: string;
}
