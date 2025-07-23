import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreatePipelineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one stage is required' })
  @ArrayMaxSize(20, { message: 'Too many stages (max 20 allowed)' })
  @IsString({ each: true })
  stages: string[];
}
