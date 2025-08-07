import { CreateTerminationDto } from './dto/create-termination.dto';
import { UpdateTerminationDto } from './dto/update-termination.dto';
export declare class TerminationService {
    create(createTerminationDto: CreateTerminationDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateTerminationDto: UpdateTerminationDto): string;
    remove(id: number): string;
}
