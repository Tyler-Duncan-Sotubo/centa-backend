import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreateBulkExpenseDto {
  @IsDateString()
  date: string;

  @IsString()
  category: string;

  @IsString()
  purpose: string;

  @IsNumber()
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
}
