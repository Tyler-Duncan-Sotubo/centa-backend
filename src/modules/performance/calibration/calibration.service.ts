import { Injectable } from '@nestjs/common';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { UpdateCalibrationDto } from './dto/update-calibration.dto';

@Injectable()
export class CalibrationService {
  create(createCalibrationDto: CreateCalibrationDto) {
    return 'This action adds a new calibration';
  }

  findAll() {
    return `This action returns all calibration`;
  }

  findOne(id: number) {
    return `This action returns a #${id} calibration`;
  }

  update(id: number, updateCalibrationDto: UpdateCalibrationDto) {
    return `This action updates a #${id} calibration`;
  }

  remove(id: number) {
    return `This action removes a #${id} calibration`;
  }
}
