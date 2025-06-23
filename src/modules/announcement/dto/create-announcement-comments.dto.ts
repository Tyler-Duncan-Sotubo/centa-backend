import { IsString } from 'class-validator';

export class CreateAnnouncementCommentDto {
  @IsString()
  comment: string;
}
