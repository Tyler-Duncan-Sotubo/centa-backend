import { db } from 'src/drizzle/types/drizzle';
import { CreateConclusionDto } from './dto/create-conclusion.dto';
import { UpdateConclusionDto } from './dto/update-conclusion.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class AssessmentConclusionsService {
    private readonly db;
    private readonly logger;
    private readonly cache;
    constructor(db: db, logger: PinoLogger, cache: CacheService);
    private oneKey;
    private burst;
    createConclusion(assessmentId: string, dto: CreateConclusionDto, authorId: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        summary: string | null;
        assessmentId: string;
        strengths: string | null;
        areasForImprovement: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    }>;
    updateConclusion(assessmentId: string, dto: UpdateConclusionDto, authorId: string): Promise<{
        id: string;
        assessmentId: string;
        summary: string | null;
        strengths: string | null;
        areasForImprovement: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    getConclusionByAssessment(assessmentId: string): Promise<{
        id: string;
        assessmentId: string;
        summary: string | null;
        strengths: string | null;
        areasForImprovement: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    private isHR;
}
