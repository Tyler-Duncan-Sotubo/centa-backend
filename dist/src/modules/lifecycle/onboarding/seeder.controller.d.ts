import { OnboardingSeederService } from './seeder.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateOnboardingTemplateDto } from './dto/create-onboarding-template.dto';
export declare class OnboardingSeederController extends BaseController {
    private readonly seeder;
    constructor(seeder: OnboardingSeederService);
    getGlobalTemplates(templateId: string): Promise<{
        fields: {
            id: string;
            templateId: string;
            order: number | null;
            label: string;
            required: boolean | null;
            fieldKey: string;
            fieldType: string;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            templateId: string;
            order: number | null;
            assignee: "employee" | "hr" | "it" | "finance" | null;
            dueDaysAfterStart: number | null;
        }[];
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        status: "draft" | "published" | null;
        isGlobal: boolean | null;
    }>;
    cloneTemplateForCompany(templateId: string, templateName: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        status: "draft" | "published" | null;
        isGlobal: boolean | null;
    }>;
    createCompanyTemplate(dto: CreateOnboardingTemplateDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        companyId: string | null;
        description: string | null;
        status: "draft" | "published" | null;
        isGlobal: boolean | null;
    }>;
    getCompanyTemplates(user: User): Promise<{
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
    getTemplatesByCompanyWithDetails(user: User): Promise<{
        fields: {
            id: string;
            templateId: string;
            order: number | null;
            label: string;
            required: boolean | null;
            fieldKey: string;
            fieldType: string;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            templateId: string;
            order: number | null;
            assignee: "employee" | "hr" | "it" | "finance" | null;
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
    updateTemplate(templateId: string, dto: CreateOnboardingTemplateDto): Promise<{
        status: string;
    }>;
}
