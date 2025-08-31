import { db } from 'src/drizzle/types/drizzle';
import { CreateOnboardingTemplateDto } from './dto/create-onboarding-template.dto';
export declare class OnboardingSeederService {
    private readonly db;
    constructor(db: db);
    seedGlobalOnboardingTemplate(): Promise<void>;
    seedInternTemplate(): Promise<void>;
    seedContractorTemplate(): Promise<void>;
    seedAllGlobalTemplates(): Promise<void>;
    private seedTemplate;
    cloneTemplateForCompany(globalTemplateId: string, companyId: string, templateName?: string): Promise<{
        status: "draft" | "published" | null;
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    createCompanyTemplate(companyId: string, dto: CreateOnboardingTemplateDto): Promise<{
        status: "draft" | "published" | null;
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    updateTemplateById(templateId: string, dto: CreateOnboardingTemplateDto): Promise<{
        status: string;
    }>;
    getTemplatesByCompanySummaries(companyId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    getTemplatesByCompany(companyId: string): Promise<{
        templateSummaries: {
            fieldCount: number;
            checklistCount: number;
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            status: "draft" | "published" | null;
            isGlobal: boolean | null;
            companyId: string | null;
        }[];
        globalTemplates: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            status: "draft" | "published" | null;
            isGlobal: boolean | null;
            companyId: string | null;
        }[];
    }>;
    getTemplatesByCompanyWithDetails(companyId: string): Promise<{
        fields: {
            id: string;
            templateId: string;
            order: number | null;
            fieldKey: string;
            label: string;
            fieldType: string;
            required: boolean | null;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
        }[];
        fieldCount: number;
        checklistCount: number;
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        status: "draft" | "published" | null;
        isGlobal: boolean | null;
        companyId: string | null;
    }[]>;
    getTemplateByIdWithDetails(templateId: string): Promise<{
        fields: {
            id: string;
            templateId: string;
            order: number | null;
            fieldKey: string;
            label: string;
            fieldType: string;
            required: boolean | null;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            templateId: string;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            order: number | null;
            dueDaysAfterStart: number | null;
        }[];
        status: "draft" | "published" | null;
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
}
