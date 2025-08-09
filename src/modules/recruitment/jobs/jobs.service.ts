import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly pipelineSeederService: PipelineSeederService,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(JobsService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `jobs:${companyId}:list`;
  }
  private oneKey(companyId: string, jobId: string) {
    return `jobs:${companyId}:job:${jobId}:detail`;
  }
  private publicJobKey(jobId: string) {
    return `public:job:${jobId}:detail`;
  }
  private async burst(opts: { companyId?: string; jobId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.companyId && opts.jobId)
      jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.jobId)));
    if (opts.jobId) jobs.push(this.cache.del(this.publicJobKey(opts.jobId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:jobs');
  }

  // ---------- create ----------
  async create(
    createDto: CreateJobDto & { pipelineTemplateId?: string },
    user: User,
  ) {
    const { companyId, id } = user;
    this.logger.info(
      { companyId, title: createDto?.title },
      'jobs:create:start',
    );

    if (createDto.externalJobId) {
      const exists = await this.db
        .select({ id: job_postings.id })
        .from(job_postings)
        .where(
          and(
            eq(job_postings.externalJobId, createDto.externalJobId),
            eq(job_postings.companyId, companyId),
          ),
        )
        .execute();

      if (exists.length > 0) {
        this.logger.warn(
          { companyId, externalJobId: createDto.externalJobId },
          'jobs:create:duplicate-externalId',
        );
        throw new BadRequestException(
          `Job with external ID "${createDto.externalJobId}" already exists for this company.`,
        );
      }
    }

    const [job] = await this.db
      .insert(job_postings)
      .values({
        ...createDto,
        companyId,
        createdBy: id,
        status: 'draft',
        createdAt: new Date(),
      })
      .returning()
      .execute();

    if (!job) {
      this.logger.error({ companyId }, 'jobs:create:failed');
      throw new BadRequestException('Failed to create job');
    }

    if (createDto.pipelineTemplateId) {
      await this.pipelineSeederService.cloneTemplateToJob(
        createDto.pipelineTemplateId,
        job.id,
      );
    }

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

    await this.burst({ companyId });
    this.logger.info({ id: job.id }, 'jobs:create:done');
    return job;
  }

  // ---------- post ----------
  async postJob(jobId: string, user: User) {
    this.logger.info({ companyId: user.companyId, jobId }, 'jobs:post:start');

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

    if (!job) {
      this.logger.warn({ jobId }, 'jobs:post:not-found');
      throw new NotFoundException('Job not found');
    }

    if (job.status === 'open') {
      this.logger.warn({ jobId }, 'jobs:post:already-open');
      throw new BadRequestException('Job is already posted');
    }

    await this.db
      .update(job_postings)
      .set({ status: 'open', postedAt: new Date() })
      .where(
        and(
          eq(job_postings.id, jobId),
          eq(job_postings.companyId, user.companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'post',
      entity: 'job',
      entityId: jobId,
      userId: user.id,
      details: 'Job posted',
      changes: { jobId, status: 'open', postedAt: new Date() },
    });

    await this.burst({ companyId: user.companyId, jobId });
    this.logger.info({ jobId }, 'jobs:post:done');
  }

  // ---------- company reads (cached) ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'jobs:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
      this.logger.debug({ companyId, count: rows.length }, 'jobs:list:db:done');
      return rows;
    });
  }

  async findOne(jobId: string, companyId: string) {
    const key = this.oneKey(companyId, jobId);
    this.logger.debug({ key, companyId, jobId }, 'jobs:detail:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
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
      return job ?? null;
    });

    if (!row) {
      this.logger.warn({ companyId, jobId }, 'jobs:detail:not-found');
      throw new NotFoundException('Job not found');
    }

    return row;
  }

  // ---------- update ----------
  async update(jobId: string, user: User, dto: UpdateJobDto) {
    const { companyId, id } = user;
    this.logger.info({ companyId, jobId }, 'jobs:update:start');

    const [updated] = await this.db
      .update(job_postings)
      .set({ ...dto })
      .where(
        and(eq(job_postings.id, jobId), eq(job_postings.companyId, companyId)),
      )
      .returning()
      .execute();

    if (!updated) {
      this.logger.warn({ companyId, jobId }, 'jobs:update:not-found');
      throw new NotFoundException('Job not found or update failed');
    }

    await this.auditService.logAction({
      action: 'update',
      entity: 'job',
      entityId: jobId,
      userId: id,
      details: 'Job updated',
      changes: { jobId, ...updated },
    });

    await this.burst({ companyId, jobId });
    this.logger.info({ jobId }, 'jobs:update:done');
    return updated;
  }

  // ---------- delete (soft) ----------
  async remove(jobId: string, user: User) {
    const { companyId, id } = user;
    this.logger.info({ companyId, jobId }, 'jobs:delete:start');

    await this.db
      .update(job_postings)
      .set({ isArchived: true })
      .where(
        and(eq(job_postings.id, jobId), eq(job_postings.companyId, companyId)),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'job',
      entityId: jobId,
      userId: id,
      details: 'Job archived',
      changes: { jobId, companyId },
    });

    await this.burst({ companyId, jobId });
    this.logger.info({ jobId }, 'jobs:delete:done');
    return { message: 'Job archived successfully' };
  }

  // ---------- public (no cache: many filters, avoid staleness without TTL) ----------
  async publicJobs(options: PublicJobsDto) {
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
    if (condition) conditions.push(condition);

    if (status) {
      const allowedStatuses = ['draft', 'open', 'closed', 'archived'] as const;
      if ((allowedStatuses as readonly string[]).includes(status)) {
        conditions.push(
          eq(job_postings.status, status as (typeof allowedStatuses)[number]),
        );
      }
    }

    if (jobType?.length) {
      const allowedJobTypes = ['onsite', 'remote', 'hybrid'] as const;
      const filteredJobTypes = jobType.filter(
        (jt): jt is (typeof allowedJobTypes)[number] =>
          allowedJobTypes.includes(jt as any),
      );
      if (filteredJobTypes.length)
        conditions.push(inArray(job_postings.jobType, filteredJobTypes));
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
      if (filteredEmploymentTypes.length)
        conditions.push(
          inArray(job_postings.employmentType, filteredEmploymentTypes),
        );
    }

    if (experienceLevel?.length) {
      conditions.push(inArray(job_postings.experienceLevel, experienceLevel));
    }

    if (location?.trim()) {
      conditions.push(ilike(job_postings.city, `%${location.toLowerCase()}%`));
    }

    if (salaryMin !== undefined)
      conditions.push(gte(job_postings.salaryRangeTo, salaryMin));
    if (salaryMax !== undefined)
      conditions.push(lte(job_postings.salaryRangeFrom, salaryMax));

    const today = new Date().toISOString();
    conditions.push(eq(job_postings.status, 'open'));
    conditions.push(gt(job_postings.deadlineDate, today));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
  }

  async publicJob(jobId: string) {
    const key = this.publicJobKey(jobId);
    this.logger.debug({ key, jobId }, 'jobs:public:detail:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
      const [job] = await this.db
        .select()
        .from(job_postings)
        .where(eq(job_postings.id, jobId))
        .execute();
      return job ?? null;
    });

    if (!row) {
      this.logger.warn({ jobId }, 'jobs:public:detail:not-found');
      throw new NotFoundException('Job not found');
    }
    return row;
  }

  async publicCompanyJobs(options: CompanyJobsDto) {
    const { companyId, search, location } = options;
    this.logger.info({ companyId }, 'jobs:publicCompanyJobs:start');

    if (!companyId) {
      this.logger.warn({}, 'jobs:publicCompanyJobs:no-companyId');
      throw new Error('companyId is required');
    }

    const conditions: SQL[] = [];

    const condition = search
      ? or(
          ilike(job_postings.title, `%${search}%`),
          ilike(job_postings.description, `%${search}%`),
        )
      : undefined;
    if (condition) conditions.push(condition);

    if (location?.trim()) {
      conditions.push(ilike(job_postings.city, `%${location.toLowerCase()}%`));
    }

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

    this.logger.info(
      { companyId, count: rows.length },
      'jobs:publicCompanyJobs:done',
    );
    return rows;
  }
}
