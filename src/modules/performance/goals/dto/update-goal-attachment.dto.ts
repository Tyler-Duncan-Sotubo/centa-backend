import { PartialType } from '@nestjs/mapped-types';
import { UploadGoalAttachmentDto } from './upload-goal-attachment.dto';

export class UpdateGoalAttachmentDto extends PartialType(
  UploadGoalAttachmentDto,
) {}
