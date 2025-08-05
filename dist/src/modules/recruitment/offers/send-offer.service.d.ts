import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OfferEmailService } from 'src/modules/notification/services/offer-email.service';
export declare class SendOffersService {
    private readonly db;
    private readonly auditService;
    private readonly jwtService;
    private readonly configService;
    private readonly offerEmailService;
    constructor(db: db, auditService: AuditService, jwtService: JwtService, configService: ConfigService, offerEmailService: OfferEmailService);
    signToken(payload: {
        offerId: string;
        email: string;
    }): string;
    verifyToken(token: string): {
        offerId: string;
        email: string;
    };
    private fetchOffer;
    getOfferFromToken(token: string): Promise<{
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
    sendOffer(offerId: string, email: string, user: User): Promise<{
        status: string;
        message: string;
    }>;
}
