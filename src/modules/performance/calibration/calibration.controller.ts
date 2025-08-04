import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CalibrationService } from './calibration.service';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { UpdateCalibrationDto } from './dto/update-calibration.dto';

@Controller('calibration')
export class CalibrationController {
  constructor(private readonly calibrationService: CalibrationService) {}

  @Post()
  create(@Body() createCalibrationDto: CreateCalibrationDto) {
    return this.calibrationService.create(createCalibrationDto);
  }

  @Get()
  findAll() {
    return this.calibrationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calibrationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCalibrationDto: UpdateCalibrationDto) {
    return this.calibrationService.update(+id, updateCalibrationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calibrationService.remove(+id);
  }
}
