import { db } from 'src/drizzle/types/drizzle';
import { SaveResponseDto } from './dto/save-response.dto';
import { BulkSaveResponsesDto } from './dto/bulk-save-responses.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class AssessmentResponsesService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private burst;
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
