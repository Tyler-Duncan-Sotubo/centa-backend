import { OfferLetterService } from './offer-letter.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';
export declare class OfferLetterController extends BaseController {
    private readonly offerLetterService;
    constructor(offerLetterService: OfferLetterService);
    cloneCompanyTemplate(user: User, templateId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        isDefault: boolean | null;
        content: string;
        isSystemTemplate: boolean | null;
        clonedFromTemplateId: string | null;
    }>;
    createOfferLetterTemplate(user: User, createOfferTemplateDto: CreateOfferTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        isDefault: boolean | null;
        content: string;
        isSystemTemplate: boolean | null;
        clonedFromTemplateId: string | null;
    }>;
    getCompanyOfferLetterTemplates(user: User): Promise<{
        companyTemplates: {
            id: string;
            companyId: string | null;
            name: string;
            content: string;
            isDefault: boolean | null;
            isSystemTemplate: boolean | null;
            createdAt: Date | null;
            clonedFromTemplateId: string | null;
        }[];
        systemTemplates: {
            id: string;
            companyId: string | null;
            name: string;
            content: string;
            isDefault: boolean | null;
            isSystemTemplate: boolean | null;
            createdAt: Date | null;
            clonedFromTemplateId: string | null;
        }[];
    }>;
    getOfferLetterTemplate(user: User, templateId: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        createdAt: Date | null;
        clonedFromTemplateId: string | null;
    }>;
    updateOfferLetterTemplate(user: User, templateId: string, updateOfferTemplateDto: UpdateOfferTemplateDto): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        createdAt: Date | null;
        clonedFromTemplateId: string | null;
    }>;
    deleteOfferLetterTemplate(user: User, templateId: string): Promise<{
        message: string;
    }>;
}
