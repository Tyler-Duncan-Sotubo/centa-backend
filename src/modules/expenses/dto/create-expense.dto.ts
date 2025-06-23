import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsString()
  category: string;

  @IsString()
  purpose: string;

  @IsString()
  amount: string;

  @IsOptional()
  @IsIn(['Requested', 'Pending', 'Paid'])
  status: 'Requested' | 'Pending' | 'Paid';

  @IsOptional()
  @IsString()
  receiptUrl: string;

  @IsOptional()
  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  rejectionReason: string;
}
