import { User } from 'src/common/types/user.type';
import { CreateConclusionDto } from './dto/create-conclusion.dto';
import { UpdateConclusionDto } from './dto/update-conclusion.dto';
import { AssessmentConclusionsService } from './conclusions.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class AssessmentConclusionsController extends BaseController {
    private readonly conclusionsService;
    constructor(conclusionsService: AssessmentConclusionsService);
    create(assessmentId: string, dto: CreateConclusionDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        assessmentId: string;
        summary: string | null;
        strengths: string | null;
        areasForImprovement: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    }>;
    update(assessmentId: string, dto: UpdateConclusionDto, user: User): Promise<{
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
    get(assessmentId: string): Promise<{
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
}
