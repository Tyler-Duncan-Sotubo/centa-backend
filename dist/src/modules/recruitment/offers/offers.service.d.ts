import { CreateOfferDto } from './dto/create-offer.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { Queue } from 'bullmq';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferLetterPdfService } from './offer-letter/offer-letter-pdf.service';
import { SignOfferDto } from './dto/signed-offer.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class OffersService {
    private readonly db;
    private readonly queue;
    private readonly auditService;
    private readonly offerLetterPdfService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, queue: Queue, auditService: AuditService, offerLetterPdfService: OfferLetterPdfService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private detailKey;
    private varsFromOfferKey;
    private varsAutoKey;
    private burst;
    create(dto: CreateOfferDto, user: User): Promise<{
        id: string;
        currency: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        createdBy: string | null;
        status: "pending" | "accepted" | "sent" | "declined" | "expired";
        applicationId: string;
        templateId: string | null;
        signingMethod: string;
        salary: string | null;
        startDate: string | null;
        expiresAt: Date | null;
        letterUrl: string | null;
        signedLetterUrl: string | null;
        signingProviderEnvelopeId: string | null;
        signingUrl: string | null;
        signedAt: Date | null;
        sentAt: Date | null;
        version: number | null;
        pdfData: Record<string, any>;
    }>;
    getTemplateVariablesWithAutoFilledData(templateId: string, applicationId: string, user: User): Promise<{
        variables: string[];
        autoFilled: Record<string, string>;
        templateContent: string;
    }>;
    findAll(companyId: string): Promise<{
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
    getTemplateVariablesFromOffer(offerId: string): Promise<{
        variables: string[];
        autoFilled: Record<string, string>;
        templateContent: string;
    }>;
    findOne(id: number): string;
    update(offerId: string, dto: UpdateOfferDto, user: User): Promise<{
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
    moveToStage(newStageId: string, applicationId: string, user: User): Promise<{
        success: boolean;
    }>;
}
