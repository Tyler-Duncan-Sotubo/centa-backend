import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { User } from 'src/common/types/user.type';
import { GetOfferTemplateVariablesDto } from './dto/get-offer-template-variables.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { SendOffersService } from './send-offer.service';
import { SignOfferDto } from './dto/signed-offer.dto';
export declare class OffersController extends BaseController {
    private readonly offersService;
    private readonly sendOffersService;
    constructor(offersService: OffersService, sendOffersService: SendOffersService);
    create(createOfferDto: CreateOfferDto, user: User): Promise<{
        id: string;
        currency: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        startDate: string | null;
        status: "pending" | "accepted" | "sent" | "declined" | "expired";
        expiresAt: Date | null;
        createdBy: string | null;
        templateId: string | null;
        applicationId: string;
        signingMethod: string;
        salary: string | null;
        letterUrl: string | null;
        signedLetterUrl: string | null;
        signingProviderEnvelopeId: string | null;
        signingUrl: string | null;
        signedAt: Date | null;
        sentAt: Date | null;
        version: number | null;
        pdfData: Record<string, any>;
    }>;
    getTemplateVariables(dto: GetOfferTemplateVariablesDto, user: User): Promise<{
        variables: string[];
        autoFilled: {
            todayDate: string;
        };
        templateContent: string;
    }>;
    getTemplateVariablesFromOffer(id: string): Promise<{
        variables: string[];
        autoFilled: Record<string, string>;
        templateContent: string;
    }>;
    findAll(user: User): Promise<{
        id: string;
        applicationId: string;
        templateId: string | null;
        status: "pending" | "accepted" | "sent" | "declined" | "expired";
        salary: string | null;
        sentAt: Date | null;
        startDate: string | null;
        candidateFullName: string;
        candidateEmail: string;
        jobTitle: string;
        letterUrl: string | null;
        signedLetterUrl: string | null;
    }[]>;
    findOne(id: string): string;
    update(id: string, updateOfferDto: UpdateOfferDto, user: User): Promise<{
        status: string;
        message: string;
    }>;
    sendOffer(offerId: string, email: string, user: User): Promise<{
        status: string;
        message: string;
    }>;
    signOffer(dto: SignOfferDto): Promise<{
        status: string;
        message: string;
    }>;
    verifyOffer(token: string): Promise<{
        id: string;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyName: string;
        jobTitle: string;
        candidateName: string;
        candidateId: string;
        companyLogo: string;
        letterUrl: string | null;
        status: "pending" | "accepted" | "sent" | "declined" | "expired";
    }>;
}
