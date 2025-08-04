import { User } from 'src/common/types/user.type';
import { AssessmentResponsesService } from './responses.service';
import { SaveResponseDto } from './dto/save-response.dto';
import { BulkSaveResponsesDto } from './dto/bulk-save-responses.dto';
export declare class AssessmentResponsesController {
    private readonly responsesService;
    constructor(responsesService: AssessmentResponsesService);
    getResponses(assessmentId: string): Promise<{
        questionId: string;
        question: string;
        type: string;
        order: number | null;
        response: string | null;
    }[]>;
    saveResponse(assessmentId: string, dto: SaveResponseDto, user: User): Promise<{
        success: boolean;
    }>;
    bulkSaveResponses(assessmentId: string, dto: BulkSaveResponsesDto, user: User): Promise<{
        success: boolean;
        count: number;
    }>;
}
