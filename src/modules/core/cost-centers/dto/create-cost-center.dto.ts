import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateCostCenterDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(0) budget: number;
}
