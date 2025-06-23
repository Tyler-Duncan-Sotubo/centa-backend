import { PartialType } from '@nestjs/mapped-types';
import { CreatePayScheduleDto } from './create-pay-schedule.dto';

export class UpdatePayScheduleDto extends PartialType(CreatePayScheduleDto) {}
