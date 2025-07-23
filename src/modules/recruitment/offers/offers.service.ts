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

@Injectable()
export class OffersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('offerPdfQueue') private readonly queue: Queue,
    private readonly auditService: AuditService,
    private readonly offerLetterPdfService: OfferLetterPdfService,
  ) {}

  async create(dto: CreateOfferDto, user: User) {
    const { id: userId, companyId } = user;
    const { applicationId, templateId, pdfData } = dto;

    // 1. Fetch application (to confirm it exists)
    const [application] = await this.db
      .select({
        candidateId: applications.candidateId,
      })
      .from(applications)
      .where(eq(applications.id, applicationId));

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (!templateId) {
      throw new BadRequestException('Template ID is required');
    }

    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.id, templateId));

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // 3. Validate required template variables
    const requiredVars = extractHandlebarsVariables(template.content);
    const SIGNATURE_FIELDS = new Set([
      'sig_emp',
      'date_emp',
      'sig_cand',
      'date_cand',
    ]);

    const missingVars = requiredVars.filter(
      (v) => !(v in pdfData) && !SIGNATURE_FIELDS.has(v),
    );

    if (missingVars.length > 0) {
      throw new BadRequestException(
        `Missing template variables: ${missingVars.join(', ')}`,
      );
    }

    const startDate = pdfData.startDate;
    const salaryRaw = pdfData.baseSalary;
    const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;

    // 4. Create the offer
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
      .returning();

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

    return offer;
  }

  async getTemplateVariablesWithAutoFilledData(
    templateId: string,
    applicationId: string,
    user: User,
  ) {
    const { companyId } = user;
    // 1. Fetch template
    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.id, templateId));

    if (!template) {
      throw new BadRequestException('Offer letter template not found');
    }

    // 2. Extract required variables
    const requiredVars = extractHandlebarsVariables(template.content);

    // 3. Get application
    const [application] = await this.db
      .select({
        candidateId: applications.candidateId,
        jobPostingId: applications.jobId,
      })
      .from(applications)
      .where(eq(applications.id, applicationId));

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // 4. Get candidate
    const [candidate] = await this.db
      .select({
        fullName: candidates.fullName,
        email: candidates.email,
      })
      .from(candidates)
      .where(eq(candidates.id, application.candidateId));

    if (!candidate) {
      throw new BadRequestException('Candidate not found');
    }

    // 5. Get job title
    const [jobPosting] = await this.db
      .select({ title: job_postings.title })
      .from(job_postings)
      .where(eq(job_postings.id, application.jobPostingId));

    if (!jobPosting) {
      throw new BadRequestException('Job posting not found');
    }

    // 6. Get company info
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
      .innerJoin(companyLocations, eq(companyLocations.companyId, companies.id))
      .where(eq(companies.id, companyId));

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    // 7. Extract names
    const fullName = candidate.fullName?.trim() || '';
    const candidateFirstName = fullName.split(' ')[0];

    const autoFilled: Record<string, string> = {};

    if (fullName) autoFilled.candidateFullName = fullName;
    if (candidateFirstName) autoFilled.candidateFirstName = candidateFirstName;
    if (candidate?.email) autoFilled.candidateEmail = candidate.email;
    if (company?.companyLogoUrl)
      autoFilled.companyLogoUrl = company.companyLogoUrl;
    if (jobPosting?.title) autoFilled.jobTitle = jobPosting.title;
    if (company?.name) autoFilled.companyName = company.name;
    if (company?.address && typeof company.address === 'string')
      autoFilled.companyAddress = company.address;
    if (company?.supportEmail) autoFilled.supportEmail = company.supportEmail;

    autoFilled.todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    autoFilled.sig_cand = '_________';
    autoFilled.date_cand = '_________';
    autoFilled.sig_emp = '_________';
    autoFilled.date_emp = '_________';

    return {
      variables: requiredVars,
      autoFilled,
      templateContent: template.content,
    };
  }

  findAll(companyId: string) {
    return this.db
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
      .where(eq(offers.companyId, companyId));
  }

  async getTemplateVariablesFromOffer(offerId: string): Promise<{
    variables: string[];
    autoFilled: Record<string, string>;
    templateContent: string;
  }> {
    // 1. Fetch offer (including template content)
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
      .where(eq(offers.id, offerId));

    if (!offer) {
      throw new BadRequestException('Offer not found');
    }

    // 2. Extract template variables
    const requiredVars = extractHandlebarsVariables(offer.templateContent);
    const cleanedPdfData = normalizeDateFields(offer.pdfData);

    // 3. Return directly from offer
    return {
      variables: requiredVars,
      autoFilled: cleanedPdfData || {},
      templateContent: offer.templateContent,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} offer`;
  }

  async update(offerId: string, dto: UpdateOfferDto, user: User) {
    const { id: userId, companyId } = user;
    const { pdfData } = dto;

    // 1. Fetch existing offer to confirm it exists and belongs to the company
    const [existingOffer] = await this.db
      .select({
        id: offers.id,
        templateId: offers.templateId,
        applicationId: offers.applicationId,
      })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.companyId, companyId)));

    if (!existingOffer || !existingOffer.templateId) {
      throw new BadRequestException('Offer not found or access denied');
    }

    const templateId = existingOffer.templateId;

    // 2. Fetch the template
    const [template] = await this.db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.id, templateId));

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // 3. Validate required template variables
    const requiredVars = extractHandlebarsVariables(template.content);
    const SIGNATURE_FIELDS = new Set([
      'sig_emp',
      'date_emp',
      'sig_cand',
      'date_cand',
    ]);

    if (!pdfData) {
      throw new BadRequestException('PDF data is required');
    }

    const missingVars = requiredVars.filter(
      (v) => !(v in pdfData) && !SIGNATURE_FIELDS.has(v),
    );

    if (missingVars.length > 0) {
      throw new BadRequestException(
        `Missing template variables: ${missingVars.join(', ')}`,
      );
    }

    const startDate = pdfData?.startDate;
    const salaryRaw = pdfData?.baseSalary;
    const salary = salaryRaw ? salaryRaw.toString().replace(/,/g, '') : null;

    // 4. Update offer with new values
    await this.db
      .update(offers)
      .set({
        pdfData,
        salary,
        startDate,
        updatedAt: new Date(),
        status: 'pending', // optional: reset to pending
      })
      .where(eq(offers.id, offerId));

    // 5. Re-generate PDF
    await this.queue.add('generate-offer-pdf', {
      templateId,
      offerId,
      candidateId: existingOffer.applicationId, // optional: ensure candidateId is passed if needed
      generatedBy: userId,
      payload: pdfData,
    });

    return {
      status: 'success',
      message: 'Offer updated and queued for PDF regeneration',
    };
  }

  async sendOffer(offerId: string, email: string, user: User) {
    const { id, companyId } = user;
    // 1. Fetch the offer to confirm it exists and belongs to the company

    const [offer] = await this.db
      .select()
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.companyId, companyId)));

    if (!offer) {
      throw new BadRequestException('Offer not found or access denied');
    }

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

  async signOffer(dto: SignOfferDto) {
    const signedUrl = await this.offerLetterPdfService.uploadSignedOffer(
      dto.signedFile,
      dto.candidateFullName,
      dto.candidateId,
    );

    // Update the offer with the signed URL
    await this.db
      .update(offers)
      .set({ signedLetterUrl: signedUrl, status: 'accepted' })
      .where(eq(offers.id, dto.offerId));

    return {
      status: 'success',
      message: 'Offer signed successfully',
    };
  }

  async moveToStage(newStageId: string, applicationId: string, user: User) {
    // Update application currentStage
    await this.db
      .update(applications)
      .set({ currentStage: newStageId })
      .where(eq(applications.id, applicationId));

    // Insert pipeline history
    await this.db.insert(pipeline_history).values({
      applicationId,
      stageId: newStageId,
      movedAt: new Date(),
      movedBy: user.id,
    });

    // Also update pipeline_stage_instances
    await this.db.insert(pipeline_stage_instances).values({
      applicationId,
      stageId: newStageId,
      enteredAt: new Date(),
    });

    // Audit log
    await this.auditService.logAction({
      action: 'move_to_stage',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: 'Moved to stage ' + newStageId,
      changes: {
        toStage: newStageId,
      },
    });

    return { success: true };
  }
}
