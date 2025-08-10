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
            order: number | null;
            label: string;
            templateId: string;
            fieldKey: string;
            fieldType: string;
            required: boolean | null;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            order: number | null;
            templateId: string;
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
            order: number | null;
            label: string;
            templateId: string;
            fieldKey: string;
            fieldType: string;
            required: boolean | null;
            tag: string;
        }[];
        checklist: {
            id: string;
            title: string;
            order: number | null;
            templateId: string;
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
