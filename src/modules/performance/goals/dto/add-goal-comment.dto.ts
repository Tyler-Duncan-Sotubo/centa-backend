import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AddGoalCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comment: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = false;
}
