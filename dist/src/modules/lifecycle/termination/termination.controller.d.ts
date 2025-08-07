import { TerminationService } from './termination.service';
import { CreateTerminationDto } from './dto/create-termination.dto';
import { UpdateTerminationDto } from './dto/update-termination.dto';
export declare class TerminationController {
    private readonly terminationService;
    constructor(terminationService: TerminationService);
    create(createTerminationDto: CreateTerminationDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateTerminationDto: UpdateTerminationDto): string;
    remove(id: string): string;
}
