import { IsOptional, IsString, Length, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { encrypt } from 'src/utils/crypto.util';

export class CreateFinanceDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankName?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankAccountNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankBranch?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  bankAccountName?: string;

  @IsString()
  @IsOptional()
  @Length(3, 3)
  @IsIn(['NGN', 'USD', 'EUR', 'GBP', 'KES', 'ZAR']) // extend as needed
  currency?: string = 'NGN';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  tin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  pensionPin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value != null ? encrypt(value) : value), {
    toClassOnly: true,
  })
  nhfNumber?: string;
}
