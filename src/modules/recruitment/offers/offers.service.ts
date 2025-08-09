import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateOfferDto } from './dto/create-offer.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { offers } from './schema/offers.schema';
import {
  applications,
  candidates,
  companies,
  companyLocations,
  job_postings,
  pipeline_history,
  pipeline_stage_instances,
} from 'src/drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';
import { offerLetterTemplates } from './offer-letter/schema/offer-letter-templates.schema';
import { User } from 'src/common/types/user.type';
import { extractHandlebarsVariables } from 'src/utils/extractHandlebarsVariables';
import { AuditService } from 'src/modules/audit/audit.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { normalizeDateFields } from 'src/utils/normalizeDateFields';
import { OfferLetterPdfService } from './offer-letter/offer-letter-pdf.service';
import { SignOfferDto } from './dto/signed-offer.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class OffersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('offerPdfQueue') private readonly queue: Queue,
    private readonly auditService: AuditService,
    private readonly offerLetterPdfService: OfferLetterPdfService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(OffersService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `offers:${companyId}:list`;
  }
  private detailKey(offerId: string) {
    return `offers:${offerId}:detail`;
  }
  private varsFromOfferKey(offerId: string) {
    return `offers:${offerId}:vars-from-offer`;
  }
  private varsAutoKey(
    companyId: string,
    templateId: string,
    applicationId: string,
  ) {
    return `offers:${companyId}:vars:auto:${templateId}:${applicationId}`;
  }
  private async burst(opts: {
    companyId?: string;
    offerId?: string;
    templateId?: string;
    applicationId?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.offerId) {
      jobs.push(this.cache.del(this.detailKey(opts.offerId)));
      jobs.push(this.cache.del(this.varsFromOfferKey(opts.offerId)));
    }
    if (opts.companyId && opts.templateId && opts.applicationId) {
      jobs.push(
        this.cache.del(
          this.varsAutoKey(opts.companyId, opts.templateId, opts.applicationId),
        ),
      );
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:offers');
  }

  // ---------- create ----------
  async create(dto: CreateOfferDto, user: User) {
    const { id: userId, companyId } = user;
    const { applicationId, templateId, pdfData } = dto;
    this.logger.info(
      { companyId, applicationId, templateId },
      'offers:create:start',
    );

    const [application] = await this.db
      .select({ candidateId: applications.candidateId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .execute();

    if (!application) {
      this.logger.warn(
        { companyId, applicationId },
        'offers:create:no-application',
      );
      throw new BadRequestException('Application not found');
    }

    if (!templateId) {
      this.logger.warn({ companyId }, 'offers:create:no-templateId');
      throw new BadRequestException('Template ID is required');
    }

    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.id, templateId))
      .execute();

    if (!template) {
      this.logger.warn(
        { companyId, templateId },
        'offers:create:template-not-found',
      );
      throw new BadRequestException('Template not found');
    }

    const requiredVars = extractHandlebarsVariables(template.content);
    const SIGNATURE_FIELDS = new Set([
      'sig_emp',
      'date_emp',
      'sig_cand',
      'date_cand',
    ]);
    const missingVars = requiredVars.filter(
      (v) => !(v in (pdfData || {})) && !SIGNATURE_FIELDS.has(v),
    );

    if (missingVars.length > 0) {
      this.logger.warn(
        { companyId, missingVars },
        'offers:create:missing-vars',
      );
      throw new BadRequestException(
        `Missing template variables: ${missingVars.join(', ')}`,
      );
    }

    const startDate = pdfData.startDate;
    const salaryRaw = pdfData.baseSalary;
    const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;

    if (
      salary !== null &&
      (isNaN(Number(salary)) || !isFinite(Number(salary as any)))
    ) {
      this.logger.warn(
        { companyId, salaryRaw },
        'offers:create:invalid-salary',
      );
      throw new BadRequestException(`Invalid salary value: "${salaryRaw}"`);
    }

    const [offer] = await this.db
      .insert(offers)
      .values({
        companyId,
        applicationId,
        templateId,
        status: 'pending',
        salary,
        startDate,
        createdBy: userId,
        pdfData,
      })
      .returning()
      .execute();

    if (offer) {
      await this.moveToStage(dto.newStageId, applicationId, user);
    }

    await this.queue.add('generate-offer-pdf', {
      templateId,
      offerId: offer.id,
      candidateId: application.candidateId,
      generatedBy: userId,
      payload: pdfData,
    });

    await this.auditService.logAction({
      action: 'create',
      entity: 'offer',
      entityId: offer.id,
      userId: userId,
      details: 'Offer created and PDF generation queued',
      changes: { applicationId, templateId, salary, startDate },
    });

    await this.burst({ companyId });
    this.logger.info({ id: offer.id }, 'offers:create:done');
    return offer;
  }

  // ---------- variables autofill (cached) ----------
  async getTemplateVariablesWithAutoFilledData(
    templateId: string,
    applicationId: string,
    user: User,
  ) {
    const { companyId } = user;
    const key = this.varsAutoKey(companyId, templateId, applicationId);
    this.logger.debug(
      { key, companyId, templateId, applicationId },
      'offers:autoVars:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const [template] = await this.db
        .select()
        .from(offerLetterTemplates)
        .where(eq(offerLetterTemplates.id, templateId))
        .execute();
      if (!template)
        throw new BadRequestException('Offer letter template not found');

      const requiredVars = extractHandlebarsVariables(template.content);

      const [application] = await this.db
        .select({
          candidateId: applications.candidateId,
          jobPostingId: applications.jobId,
        })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .execute();
      if (!application) throw new BadRequestException('Application not found');

      const [candidate] = await this.db
        .select({ fullName: candidates.fullName, email: candidates.email })
        .from(candidates)
        .where(eq(candidates.id, application.candidateId))
        .execute();
      if (!candidate) throw new BadRequestException('Candidate not found');

      const [jobPosting] = await this.db
        .select({ title: job_postings.title })
        .from(job_postings)
        .where(eq(job_postings.id, application.jobPostingId))
        .execute();
      if (!jobPosting) throw new BadRequestException('Job posting not found');

      const [company] = await this.db
        .select({
          name: companies.name,
          address:
            sql`concat(${companyLocations.street}, ', ', ${companyLocations.city}, ', ', ${companyLocations.state} || ' ', ${companyLocations.country})`.as(
              'address',
            ),
          companyLogoUrl: companies.logo_url,
          supportEmail: companies.primaryContactEmail,
        })
        .from(companies)
        .innerJoin(
          companyLocations,
          eq(companyLocations.companyId, companies.id),
        )
        .where(eq(companies.id, companyId))
        .execute();
      if (!company) throw new BadRequestException('Company not found');

      const fullName = candidate.fullName?.trim() || '';
      const candidateFirstName = fullName.split(' ')[0];

      const autoFilled: Record<string, string> = {};
      if (fullName) autoFilled.candidateFullName = fullName;
      if (candidateFirstName)
        autoFilled.candidateFirstName = candidateFirstName;
      if (candidate?.email) autoFilled.candidateEmail = candidate.email;
      if (company?.companyLogoUrl)
        autoFilled.companyLogoUrl = company.companyLogoUrl;
      if (jobPosting?.title) autoFilled.jobTitle = jobPosting.title;
      if (company?.name) autoFilled.companyName = company.name;
      if (company?.address && typeof company.address === 'string')
        autoFilled.companyAddress = company.address as string;
      if (company?.supportEmail)
        autoFilled.supportEmail = company.supportEmail as string;

      autoFilled.todayDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      autoFilled.sig_cand = '_________';
      autoFilled.date_cand = '_________';
      autoFilled.sig_emp = '_________';
      autoFilled.date_emp = '_________';

      const payload = {
        variables: requiredVars,
        autoFilled,
        templateContent: template.content,
      };
      this.logger.debug(
        { companyId, count: requiredVars.length },
        'offers:autoVars:db:done',
      );
      return payload;
    });
  }

  // ---------- list/read (cached) ----------
  findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'offers:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: offers.id,
          applicationId: offers.applicationId,
          templateId: offers.templateId,
          status: offers.status,
          salary: offers.salary,
          sentAt: offers.sentAt,
          startDate: offers.startDate,
          candidateFullName: candidates.fullName,
          candidateEmail: candidates.email,
          jobTitle: job_postings.title,
          letterUrl: offers.letterUrl,
          signedLetterUrl: offers.signedLetterUrl,
        })
        .from(offers)
        .innerJoin(applications, eq(applications.id, offers.applicationId))
        .innerJoin(job_postings, eq(job_postings.id, applications.jobId))
        .innerJoin(candidates, eq(candidates.id, applications.candidateId))
        .where(eq(offers.companyId, companyId))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'offers:list:db:done',
      );
      return rows;
    });
  }

  // ---------- vars-from-offer (cached) ----------
  async getTemplateVariablesFromOffer(offerId: string): Promise<{
    variables: string[];
    autoFilled: Record<string, string>;
    templateContent: string;
  }> {
    const key = this.varsFromOfferKey(offerId);
    this.logger.debug({ key, offerId }, 'offers:varsFromOffer:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [offer] = await this.db
        .select({
          pdfData: offers.pdfData,
          templateContent: offerLetterTemplates.content,
        })
        .from(offers)
        .innerJoin(
          offerLetterTemplates,
          eq(offers.templateId, offerLetterTemplates.id),
        )
        .where(eq(offers.id, offerId))
        .execute();

      if (!offer) {
        throw new BadRequestException('Offer not found');
      }

      const requiredVars = extractHandlebarsVariables(offer.templateContent);
      const cleanedPdfData = normalizeDateFields(offer.pdfData);

      return {
        variables: requiredVars,
        autoFilled: cleanedPdfData || {},
        templateContent: offer.templateContent,
      };
    });
  }

  // ---------- misc ----------
  findOne(id: number) {
    return `This action returns a #${id} offer`;
  }

  async update(offerId: string, dto: UpdateOfferDto, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, offerId }, 'offers:update:start');

    const [existingOffer] = await this.db
      .select({
        id: offers.id,
        templateId: offers.templateId,
        applicationId: offers.applicationId,
      })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.companyId, companyId)))
      .execute();

    if (!existingOffer || !existingOffer.templateId) {
      this.logger.warn({ companyId, offerId }, 'offers:update:not-found');
      throw new BadRequestException('Offer not found or access denied');
    }

    const templateId = existingOffer.templateId;

    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.id, templateId))
      .execute();
    if (!template) {
      this.logger.warn({ templateId }, 'offers:update:template-not-found');
      throw new BadRequestException('Template not found');
    }

    const requiredVars = extractHandlebarsVariables(template.content);
    const SIGNATURE_FIELDS = new Set([
      'sig_emp',
      'date_emp',
      'sig_cand',
      'date_cand',
    ]);

    if (!dto.pdfData) {
      this.logger.warn({ offerId }, 'offers:update:no-pdfData');
      throw new BadRequestException('PDF data is required');
    }

    const missingVars = requiredVars.filter(
      (v) => !(v in (dto.pdfData ?? {})) && !SIGNATURE_FIELDS.has(v),
    );
    if (missingVars.length > 0) {
      this.logger.warn({ offerId, missingVars }, 'offers:update:missing-vars');
      throw new BadRequestException(
        `Missing template variables: ${missingVars.join(', ')}`,
      );
    }

    const startDate = dto.pdfData?.startDate;
    const salaryRaw = dto.pdfData?.baseSalary;
    const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;

    await this.db
      .update(offers)
      .set({
        pdfData: dto.pdfData,
        salary,
        startDate,
        updatedAt: new Date(),
        status: 'pending',
      })
      .where(eq(offers.id, offerId))
      .execute();

    await this.queue.add('generate-offer-pdf', {
      templateId,
      offerId,
      candidateId: existingOffer.applicationId, // NOTE: consider also joining candidate id if needed
      generatedBy: userId,
      payload: dto.pdfData,
    });

    await this.auditService.logAction({
      action: 'update',
      entity: 'offer',
      entityId: offerId,
      userId: userId,
      details: 'Offer updated and PDF regeneration queued',
      changes: { startDate, salary },
    });

    await this.burst({
      companyId,
      offerId,
      templateId,
      applicationId: existingOffer.applicationId,
    });
    this.logger.info({ id: offerId }, 'offers:update:done');

    return {
      status: 'success',
      message: 'Offer updated and queued for PDF regeneration',
    };
  }

  async sendOffer(offerId: string, email: string, user: User) {
    const { id, companyId } = user;
    this.logger.info({ companyId, offerId, email }, 'offers:send:start');

    const [offer] = await this.db
      .select()
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.companyId, companyId)))
      .execute();
    if (!offer) {
      this.logger.warn({ companyId, offerId }, 'offers:send:not-found');
      throw new BadRequestException('Offer not found or access denied');
    }

    await this.auditService.logAction({
      action: 'send',
      entity: 'offer',
      entityId: offerId,
      userId: id,
      details: 'Offer sent',
      changes: {},
    });
    await this.burst({ companyId, offerId });
    this.logger.info({ offerId }, 'offers:send:done');

    return { status: 'success', message: 'Offer sent successfully' };
  }

  async signOffer(dto: SignOfferDto) {
    this.logger.info(
      { offerId: dto.offerId, candidateId: dto.candidateId },
      'offers:sign:start',
    );

    const signedUrl = await this.offerLetterPdfService.uploadSignedOffer(
      dto.signedFile,
      dto.candidateFullName,
      dto.candidateId,
    );

    await this.db
      .update(offers)
      .set({ signedLetterUrl: signedUrl, status: 'accepted' })
      .where(eq(offers.id, dto.offerId))
      .execute();

    await this.auditService.logAction({
      action: 'sign',
      entity: 'offer',
      entityId: dto.offerId,
      userId: dto.candidateId, // if you track differently, adjust
      details: 'Offer signed',
      changes: { signedLetterUrl: signedUrl },
    });

    await this.burst({ offerId: dto.offerId });
    this.logger.info({ offerId: dto.offerId }, 'offers:sign:done');

    return { status: 'success', message: 'Offer signed successfully' };
  }

  async moveToStage(newStageId: string, applicationId: string, user: User) {
    this.logger.info(
      { applicationId, newStageId, userId: user.id },
      'offers:moveToStage:start',
    );

    await this.db
      .update(applications)
      .set({ currentStage: newStageId })
      .where(eq(applications.id, applicationId))
      .execute();

    await this.db
      .insert(pipeline_history)
      .values({
        applicationId,
        stageId: newStageId,
        movedAt: new Date(),
        movedBy: user.id,
      })
      .execute();

    await this.db
      .insert(pipeline_stage_instances)
      .values({ applicationId, stageId: newStageId, enteredAt: new Date() })
      .execute();

    await this.auditService.logAction({
      action: 'move_to_stage',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: 'Moved to stage ' + newStageId,
      changes: { toStage: newStageId },
    });

    this.logger.info({ applicationId, newStageId }, 'offers:moveToStage:done');
    return { success: true };
  }
}
