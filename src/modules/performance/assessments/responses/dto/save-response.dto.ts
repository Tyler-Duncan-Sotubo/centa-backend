import { IsUUID, IsString } from 'class-validator';

export class SaveResponseDto {
  @IsUUID()
  questionId: string;

  @IsString()
  response: string;
}
