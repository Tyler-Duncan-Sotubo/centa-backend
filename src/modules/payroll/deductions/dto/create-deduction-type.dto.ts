// dto/create-deduction-type.dto.ts
import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateDeductionTypeDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  code: string; // e.g., 'UNION_DUES', 'COOP_SOCIETY'

  @IsBoolean()
  systemDefined: boolean = true;

  @IsBoolean()
  requiresMembership: boolean = false;
}
