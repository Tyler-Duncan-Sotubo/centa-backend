import { PerformanceReviewQuestionService } from './questions.service';
import { PerformanceCompetencyService } from './competency.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { RoleCompetencyExpectationService } from './role-competency.service';
import { CreateRoleExpectationDto } from './dto/create-role-expectation.dto';
import { UpdateRoleExpectationDto } from './dto/update-role-expectation.dto';
export declare class SeedController extends BaseController {
    private readonly performanceReviewQuestionService;
    private readonly performanceCompetencyService;
    private readonly roleCompetencyExpectationService;
    constructor(performanceReviewQuestionService: PerformanceReviewQuestionService, performanceCompetencyService: PerformanceCompetencyService, roleCompetencyExpectationService: RoleCompetencyExpectationService);
    createCompetency(user: User, dto: CreateCompetencyDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    getCompetencies(user: User): Promise<{
        questions: {
            id: string;
            companyId: string | null;
            competencyId: string | null;
            question: string;
            type: string;
            isMandatory: boolean | null;
            allowNotes: boolean | null;
            isActive: boolean | null;
            isGlobal: boolean | null;
            createdAt: Date | null;
        }[];
        id: string;
        companyId: string | null;
        name: string;
        description: string | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }[]>;
    getOnlyCompetencies(user: User): Promise<{
        id: string;
        name: string;
    }[]>;
    updateCompetency(user: User, id: string, dto: UpdateCompetencyDto): Promise<{
        message: string;
    }>;
    deleteCompetency(user: User, id: string): Promise<{
        message: string;
    }>;
    seedLevels(): Promise<{
        message: string;
    }>;
    getLevels(): Promise<{
        id: string;
        name: string;
        weight: number;
    }[]>;
    create(dto: CreateRoleExpectationDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        roleId: string;
        competencyId: string;
        expectedLevelId: string;
    }>;
    list(user: User): Promise<{
        id: string;
        companyId: string | null;
        roleId: string;
        competencyId: string;
        expectedLevelId: string;
    }[]>;
    getFramework(user: User): Promise<{
        roles: {
            id: string;
            title: string;
        }[];
        expectationsByRole: Record<string, {
            id: string;
            competencyName: string;
            levelName: string;
            competencyId: string;
        }[]>;
    }>;
    getFrameworkFields(user: User): Promise<{
        competencies: {
            id: string;
            name: string;
        }[];
        levels: {
            id: string;
            name: string;
        }[];
    }>;
    update(id: string, dto: UpdateRoleExpectationDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        roleId: string;
        competencyId: string;
        expectedLevelId: string;
    }>;
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
    createQuestion(user: User, dto: CreateQuestionsDto): Promise<{
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        type: string;
        isGlobal: boolean | null;
        question: string;
        competencyId: string | null;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
    }>;
    getQuestions(user: User): Promise<{
        id: string;
        companyId: string | null;
        competencyId: string | null;
        question: string;
        type: string;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }[]>;
    updateQuestion(user: User, id: string, dto: UpdateQuestionsDto): Promise<{
        message: string;
    }>;
    deleteQuestion(user: User, id: string): Promise<{
        message: string;
    }>;
}
