import { Module } from '@nestjs/common';
import { CalibrationService } from './calibration.service';
import { CalibrationController } from './calibration.controller';

@Module({
  controllers: [CalibrationController],
  providers: [CalibrationService],
})
export class CalibrationModule {}
