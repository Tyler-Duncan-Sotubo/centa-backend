import { PartialType } from '@nestjs/mapped-types';
import { CreateOffCycleDto } from './create-off-cycle.dto';

export class UpdateOffCycleDto extends PartialType(CreateOffCycleDto) {}
