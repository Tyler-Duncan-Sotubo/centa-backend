import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { UpdateCalibrationDto } from './dto/update-calibration.dto';
export declare class CalibrationService {
    create(createCalibrationDto: CreateCalibrationDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateCalibrationDto: UpdateCalibrationDto): string;
    remove(id: number): string;
}
