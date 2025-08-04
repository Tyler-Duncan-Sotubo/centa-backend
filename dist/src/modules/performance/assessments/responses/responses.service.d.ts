import { db } from 'src/drizzle/types/drizzle';
import { SaveResponseDto } from './dto/save-response.dto';
import { BulkSaveResponsesDto } from './dto/bulk-save-responses.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class AssessmentResponsesService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    getResponsesForAssessment(assessmentId: string): Promise<{
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
