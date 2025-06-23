import { PartialType } from '@nestjs/mapped-types';
import { CreateClockInOutDto } from './create-clock-in-out.dto';

export class UpdateClockInOutDto extends PartialType(CreateClockInOutDto) {}
