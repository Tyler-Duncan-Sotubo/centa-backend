import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { offers } from './schema/offers.schema';
import { eq, and } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OfferEmailService } from 'src/modules/notification/services/offer-email.service';
import {
  applications,
  candidates,
  companies,
  job_postings,
} from 'src/drizzle/schema';

@Injectable()
export class SendOffersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly offerEmailService: OfferEmailService,
  ) {}

  signToken(payload: { offerId: string; email: string }) {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: `${this.configService.get<number>('OFFER_TOKEN_EXPIRATION', 604800)}s`, // default 7 days
    });
  }

  verifyToken(token: string): { offerId: string; email: string } {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as { offerId: string; email: string };
    } catch (err) {
      console.error('Invalid offer token:', err);
      throw new UnauthorizedException('Invalid or expired offer token');
    }
  }

  private async fetchOffer(offerId: string, email: string) {
    const [offer] = await this.db
      .select({
        id: offers.id,
        companyId: offers.companyId,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        companyName: companies.name,
        jobTitle: job_postings.title,
        candidateName: candidates.fullName,
        candidateId: candidates.id,
        companyLogo: companies.logo_url,
        letterUrl: offers.letterUrl,
        status: offers.status,
      })
      .from(offers)
      .innerJoin(applications, eq(applications.id, offers.applicationId))
      .innerJoin(job_postings, eq(job_postings.id, applications.jobId))
      .innerJoin(candidates, eq(candidates.id, applications.candidateId))
      .innerJoin(companies, eq(companies.id, offers.companyId))
      .where(and(eq(offers.id, offerId), eq(candidates.email, email)));

    if (!offer) {
      throw new BadRequestException('Offer not found or access denied');
    }

    return offer;
  }

  async getOfferFromToken(token: string) {
    // 1. Verify token (throws if invalid)
    const { offerId, email } = this.verifyToken(token);
    // 2. Fetch offer from DB
    const offer = await this.fetchOffer(offerId, email);
    return offer;
  }

  async sendOffer(offerId: string, email: string, user: User) {
    const { id, companyId } = user;
    // 1. Fetch the offer to confirm it exists and belongs to the company

    const [offer] = await this.db
      .select({
        id: offers.id,
        companyId: offers.companyId,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
        companyName: companies.name,
        jobTitle: job_postings.title,
        candidateName: candidates.fullName,
        companyLogo: companies.logo_url,
      })
      .from(offers)
      .innerJoin(applications, eq(applications.id, offers.applicationId))
      .innerJoin(job_postings, eq(job_postings.id, applications.jobId))
      .innerJoin(candidates, eq(candidates.id, applications.candidateId))
      .innerJoin(companies, eq(companies.id, offers.companyId))
      .where(and(eq(offers.id, offerId), eq(offers.companyId, companyId)));

    if (!offer) {
      throw new BadRequestException('Offer not found or access denied');
    }

    const token = this.signToken({ offerId, email });
    const offerUrl = `${this.configService.get<string>('CAREER_URL')}/offer/${token}`;

    await this.offerEmailService.sendOfferEmail(
      email,
      offer.candidateName,
      offer.jobTitle,
      offer.companyName,
      offerUrl,
      offer.companyLogo || 'https://centahr.com/logo.png', // Fallback logo if not provided
    );

    // 2. Update the offer status to 'sent'
    await this.db
      .update(offers)
      .set({ sentAt: new Date(), updatedAt: new Date(), status: 'sent' })
      .where(eq(offers.id, offerId));

    // Audit log
    await this.auditService.logAction({
      action: 'send',
      entity: 'offer',
      entityId: offerId,
      userId: id,
      details: 'Offer sent',
      changes: {},
    });

    return {
      status: 'success',
      message: 'Offer sent successfully',
    };
  }
}
