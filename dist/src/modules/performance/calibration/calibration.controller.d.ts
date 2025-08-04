import { CalibrationService } from './calibration.service';
import { CreateCalibrationDto } from './dto/create-calibration.dto';
import { UpdateCalibrationDto } from './dto/update-calibration.dto';
export declare class CalibrationController {
    private readonly calibrationService;
    constructor(calibrationService: CalibrationService);
    create(createCalibrationDto: CreateCalibrationDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateCalibrationDto: UpdateCalibrationDto): string;
    remove(id: string): string;
}
