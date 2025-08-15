import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  eq,
  and,
  asc,
  gte,
  inArray,
  or,
  ilike,
  lte,
  desc,
  SQL,
  gt,
} from 'drizzle-orm';
import { job_postings } from './schema/job-postings.schema';
import { PipelineSeederService } from '../pipeline/pipeline-seeder.service';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { PublicJobsDto } from './dto/public-jobs.dto';
import { companies } from 'src/drizzle/schema';
import { CompanyJobsDto } from './dto/company-job.dto';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class JobsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly pipelineSeederService: PipelineSeederService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "global"
    return [
      `company:${scope}:jobs`,
      `company:${scope}:jobs:list`,
      `company:${scope}:jobs:public`,
    ];
  }

  // Create a job and optionally clone a pipeline template into it
  async create(
    createDto: CreateJobDto & { pipelineTemplateId?: string },
    user: User,
  ) {
    const { companyId, id } = user;

    // Step 1: Check for duplicate externalJobId (if provided)
    if (createDto.externalJobId) {
      const exists = await this.db
        .select()
        .from(job_postings)
        .where(
          and(
            eq(job_postings.externalJobId, createDto.externalJobId),
            eq(job_postings.companyId, companyId),
          ),
        )
        .execute();

      if (exists.length > 0) {
        throw new BadRequestException(
          `Job with external ID "${createDto.externalJobId}" already exists for this company.`,
        );
      }
    }

    // Step 2: Create the job
    const [job] = await this.db
      .insert(job_postings)
      .values({
        ...createDto,
        companyId,
        createdBy: id,
        status: 'draft',
        createdAt: new Date(),
      })
      .returning();

    if (!job) throw new BadRequestException('Failed to create job');

    // Step 3: Optionally clone pipeline template to job
    if (createDto.pipelineTemplateId) {
      await this.pipelineSeederService.cloneTemplateToJob(
        createDto.pipelineTemplateId,
        job.id,
      );
    }

    // Step 4: Audit the job creation
    await this.auditService.logAction({
      action: 'create',
      entity: 'job',
      entityId: job.id,
      userId: id,
      details: 'Job created',
      changes: {
        title: job.title,
        country: job.country,
        state: job.state,
        city: job.city,
        jobType: job.jobType,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        yearsOfExperience: job.yearsOfExperience,
        qualification: job.qualification,
        description: job.description,
        externalJobId: job.externalJobId,
      },
    });

    // Invalidate caches (company + global public views)
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.bumpCompanyVersion('global');

    return job;
  }

  // Post the job both internally and externally
  async postJob(jobId: string, user: User) {
    // Step 1: Find the job
    const [job] = await this.db
      .select()
      .from(job_postings)
      .where(
        and(
          eq(job_postings.id, jobId),
          eq(job_postings.companyId, user.companyId),
        ),
      )
      .execute();

    if (!job) throw new NotFoundException('Job not found');

    // Step 2: Check if the job is already posted
    if (job.status === 'open') {
      throw new BadRequestException('Job is already posted');
    }

    // Step 3: Update the job status to 'posted'
    await this.db
      .update(job_postings)
      .set({ status: 'open', postedAt: new Date() })
      .where(
        and(
          eq(job_postings.id, jobId),
          eq(job_postings.companyId, user.companyId),
        ),
      )
      .returning();

    // Step 4: Log the action
    await this.auditService.logAction({
      action: 'post',
      entity: 'job',
      entityId: jobId,
      userId: user.id,
      details: 'Job posted',
      changes: {
        jobId,
        status: 'open',
        postedAt: new Date(),
      },
    });

    // Invalidate caches (company + global public views)
    await this.cache.bumpCompanyVersion(user.companyId);
    await this.cache.bumpCompanyVersion('global');
  }

  // Fetch all jobs for a company (cached)
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['jobs', 'list', 'all'],
      async () => {
        const rows = await this.db
          .select({
            id: job_postings.id,
            title: job_postings.title,
            description: job_postings.description,
            status: job_postings.status,
            jobType: job_postings.jobType,
            employmentType: job_postings.employmentType,
            deadlineDate: job_postings.deadlineDate,
          })
          .from(job_postings)
          .where(eq(job_postings.companyId, companyId))
          .orderBy(asc(job_postings.createdAt))
          .execute();

        return rows;
      },
      { tags: this.tags(companyId) },
    );
  }

  // Get a single job (scoped to company) (cached)
  async findOne(jobId: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['jobs', 'detail', jobId],
      async () => {
        const [job] = await this.db
          .select()
          .from(job_postings)
          .where(
            and(
              eq(job_postings.id, jobId),
              eq(job_postings.companyId, companyId),
            ),
          )
          .execute();

        if (!job) throw new NotFoundException('Job not found');
        return job;
      },
      { tags: this.tags(companyId) },
    );
  }

  // Update a job (basic fields only)
  async update(jobId: string, user: User, dto: UpdateJobDto) {
    const { companyId, id } = user;

    const [updated] = await this.db
      .update(job_postings)
      .set({ ...dto })
      .where(
        and(eq(job_postings.id, jobId), eq(job_postings.companyId, companyId)),
      )
      .returning();

    if (!updated) throw new NotFoundException('Job not found or update failed');

    // log the update action
    await this.auditService.logAction({
      action: 'update',
      entity: 'job',
      entityId: jobId,
      userId: id,
      details: 'Job updated',
      changes: {
        jobId,
        ...updated,
      },
    });

    // Invalidate caches (company + global public views)
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.bumpCompanyVersion('global');

    return updated;
  }

  // Delete (archive) a job
  async remove(jobId: string, user: User) {
    const { companyId, id } = user;

    await this.db
      .update(job_postings)
      .set({ isArchived: true }) // Soft delete by archiving
      .where(
        and(eq(job_postings.id, jobId), eq(job_postings.companyId, companyId)),
      )
      .execute();

    // log the deletion action
    await this.auditService.logAction({
      action: 'delete',
      entity: 'job',
      entityId: jobId,
      userId: id,
      details: 'Job archived',
      changes: {
        jobId,
        companyId,
      },
    });

    // Invalidate caches (company + global public views)
    await this.cache.bumpCompanyVersion(companyId);
    await this.cache.bumpCompanyVersion('global');

    return { message: 'Job archived successfully' };
  }

  // Public: list jobs (cached under global scope; key includes filters)
  async publicJobs(options: PublicJobsDto) {
    const key = [
      'jobs',
      'public',
      'list',
      // serialize the filter options so different queries get different cache entries
      JSON.stringify({
        ...options,
        // normalize defaults to keep key stable
        limit: options.limit ?? 10,
        offset: options.offset ?? 0,
        sortBy: options.sortBy ?? 'createdAt',
        sortDirection: options.sortDirection ?? 'asc',
      }),
    ];

    return this.cache.getOrSetVersioned(
      'global',
      key,
      async () => {
        const {
          search,
          limit = 10,
          offset = 0,
          sortBy = 'createdAt',
          sortDirection = 'asc',
          jobType,
          employmentType,
          experienceLevel,
          location,
          status,
          salaryMin,
          salaryMax,
        } = options;

        const sortColumnMap: Record<string, any> = {
          title: job_postings.title,
          createdAt: job_postings.createdAt,
          deadlineDate: job_postings.deadlineDate,
        };

        const sortColumn = sortColumnMap[sortBy] || job_postings.createdAt;
        const sortFn = sortDirection === 'desc' ? desc : asc;

        const conditions: SQL[] = [];

        const condition = search
          ? or(
              ilike(job_postings.title, `%${search}%`),
              ilike(job_postings.description, `%${search}%`),
            )
          : undefined;

        if (condition) conditions.push(condition); // ✅ Prevent undefined push

        if (status) {
          const allowedStatuses = [
            'draft',
            'open',
            'closed',
            'archived',
          ] as const;
          if ((allowedStatuses as readonly string[]).includes(status)) {
            conditions.push(
              eq(
                job_postings.status,
                status as (typeof allowedStatuses)[number],
              ),
            );
          }
        }

        if (jobType?.length) {
          const allowedJobTypes = ['onsite', 'remote', 'hybrid'] as const;
          const filteredJobTypes = jobType.filter(
            (jt): jt is (typeof allowedJobTypes)[number] =>
              allowedJobTypes.includes(jt as any),
          );
          if (filteredJobTypes.length) {
            conditions.push(inArray(job_postings.jobType, filteredJobTypes));
          }
        }

        if (employmentType?.length) {
          const allowedEmploymentTypes = [
            'permanent',
            'temporary',
            'contract',
            'internship',
            'freelance',
            'part_time',
            'full_time',
          ] as const;
          const filteredEmploymentTypes = employmentType.filter(
            (et): et is (typeof allowedEmploymentTypes)[number] =>
              allowedEmploymentTypes.includes(et as any),
          );
          if (filteredEmploymentTypes.length) {
            conditions.push(
              inArray(job_postings.employmentType, filteredEmploymentTypes),
            );
          }
        }

        if (experienceLevel?.length) {
          conditions.push(
            inArray(job_postings.experienceLevel, experienceLevel),
          );
        }

        if (location?.trim()) {
          conditions.push(
            ilike(job_postings.city, `%${location.toLowerCase()}%`),
          );
        }

        if (salaryMin !== undefined) {
          conditions.push(gte(job_postings.salaryRangeTo, salaryMin));
        }

        if (salaryMax !== undefined) {
          conditions.push(lte(job_postings.salaryRangeFrom, salaryMax));
        }

        const today = new Date().toISOString();

        conditions.push(eq(job_postings.status, 'open'));
        conditions.push(gt(job_postings.deadlineDate, today));

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        const rows = await this.db
          .select({
            id: job_postings.id,
            title: job_postings.title,
            description: job_postings.description,
            status: job_postings.status,
            jobType: job_postings.jobType,
            employmentType: job_postings.employmentType,
            deadlineDate: job_postings.deadlineDate,
            createdAt: job_postings.createdAt,
            salaryRangeFrom: job_postings.salaryRangeFrom,
            salaryRangeTo: job_postings.salaryRangeTo,
            experiences: job_postings.experienceLevel,
            location: job_postings.city,
            companyName: companies.name,
            companyLogo: companies.logo_url,
            companyId: job_postings.companyId,
          })
          .from(job_postings)
          .innerJoin(companies, eq(job_postings.companyId, companies.id))
          .where(whereClause)
          .orderBy(sortFn(sortColumn))
          .limit(limit)
          .offset(offset)
          .execute();

        return rows;
      },
      { tags: this.tags('global') },
    );
  }

  // Public: single job (cached under global scope)
  async publicJob(jobId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['jobs', 'public', 'detail', jobId],
      async () => {
        const [job] = await this.db
          .select()
          .from(job_postings)
          .where(eq(job_postings.id, jobId))
          .execute();

        if (!job) throw new NotFoundException('Job not found');
        return job;
      },
      { tags: this.tags('global') },
    );
  }

  // Public: company jobs (cached under company scope)
  async publicCompanyJobs(options: CompanyJobsDto) {
    const { companyId, search, location } = options;

    if (!companyId) {
      throw new Error('companyId is required');
    }

    const key = [
      'jobs',
      'public',
      'company',
      companyId,
      JSON.stringify({ search: search ?? '', location: location ?? '' }),
    ];

    return this.cache.getOrSetVersioned(
      companyId,
      key,
      async () => {
        const conditions: SQL[] = [];

        const condition = search
          ? or(
              ilike(job_postings.title, `%${search}%`),
              ilike(job_postings.description, `%${search}%`),
            )
          : undefined;

        if (condition) conditions.push(condition); // ✅ Prevent undefined push

        // Location filter
        if (location?.trim()) {
          conditions.push(
            ilike(job_postings.city, `%${location.toLowerCase()}%`),
          );
        }

        // Always filter for active, visible jobs
        const today = new Date().toISOString();

        conditions.push(eq(job_postings.companyId, companyId));
        conditions.push(eq(job_postings.status, 'open'));
        conditions.push(gt(job_postings.deadlineDate, today));

        const rows = await this.db
          .select({
            id: job_postings.id,
            title: job_postings.title,
            description: job_postings.description,
            status: job_postings.status,
            jobType: job_postings.jobType,
            employmentType: job_postings.employmentType,
            deadlineDate: job_postings.deadlineDate,
            createdAt: job_postings.createdAt,
            salaryRangeFrom: job_postings.salaryRangeFrom,
            salaryRangeTo: job_postings.salaryRangeTo,
            experiences: job_postings.experienceLevel,
            location: job_postings.city,
            companyName: companies.name,
            companyLogo: companies.logo_url,
          })
          .from(job_postings)
          .innerJoin(companies, eq(job_postings.companyId, companies.id))
          .where(and(...conditions))
          .orderBy(desc(job_postings.createdAt))
          .execute();

        return rows;
      },
      { tags: [...this.tags(companyId), ...this.tags('global')] },
    );
  }
}
