import { IsBoolean } from 'class-validator';

export class UpdateFeedbackSettingsDto {
  @IsBoolean()
  enableEmployeeFeedback: boolean;

  @IsBoolean()
  enableManagerFeedback: boolean;

  @IsBoolean()
  allowAnonymous: boolean;
}
