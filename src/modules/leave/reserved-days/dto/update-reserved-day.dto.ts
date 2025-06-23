import { PartialType } from '@nestjs/mapped-types';
import { CreateReservedDayDto } from './create-reserved-day.dto';

export class UpdateReservedDayDto extends PartialType(CreateReservedDayDto) {}
