import { PartialType } from '@nestjs/mapped-types';
import { CreateCalibrationDto } from './create-calibration.dto';

export class UpdateCalibrationDto extends PartialType(CreateCalibrationDto) {}
