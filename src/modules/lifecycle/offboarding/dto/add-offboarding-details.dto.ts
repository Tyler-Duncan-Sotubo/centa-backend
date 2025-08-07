import { IsArray, ArrayNotEmpty, IsString, IsOptional } from 'class-validator';

export class AddOffboardingDetailsDto {
  @IsArray()
  @ArrayNotEmpty()
  checklistItemIds!: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
