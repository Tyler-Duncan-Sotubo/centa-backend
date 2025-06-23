import { PartialType } from '@nestjs/mapped-types';
import { CreateCompensationDto } from './create-compensation.dto';

export class UpdateCompensationDto extends PartialType(CreateCompensationDto) {}
