import { PartialType } from '@nestjs/mapped-types';
import { CreateBlockedDayDto } from './create-blocked-day.dto';

export class UpdateBlockedDayDto extends PartialType(CreateBlockedDayDto) {}
