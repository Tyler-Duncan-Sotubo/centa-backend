import { db } from 'src/drizzle/types/drizzle';
import { CreateFieldDto } from './dto/create-field.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ApplicationFormService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private tags;
    seedDefaultFields(): Promise<void>;
    getDefaultFields(): Promise<{
        id: string;
        section: string;
        label: string;
        fieldType: string;
        isGlobal: boolean | null;
    }[]>;
    upsertApplicationForm(jobId: string, user: User, config: {
        style: 'resume_only' | 'form_only' | 'both';
        includeReferences?: boolean;
        customFields?: CreateFieldDto[];
        customQuestions?: CreateQuestionDto[];
    }): Promise<{
        formId: string;
    }>;
    getFormPreview(jobId: string): Promise<{
        style: "both" | "resume_only" | "form_only";
        includeReferences: boolean | null;
        fields: {
            id: string;
            formId: string;
            section: string;
            isVisible: boolean | null;
            isEditable: boolean | null;
            label: string;
            fieldType: string;
            required: boolean | null;
            order: number;
        }[];
        questions: {
            id: string;
            formId: string;
            question: string;
            type: string;
            required: boolean | null;
            order: number;
            companyId: string;
        }[];
    }>;
}
