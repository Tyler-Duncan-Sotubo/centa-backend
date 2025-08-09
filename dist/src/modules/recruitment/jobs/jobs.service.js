"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const job_postings_schema_1 = require("./schema/job-postings.schema");
const pipeline_seeder_service_1 = require("../pipeline/pipeline-seeder.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../drizzle/schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let JobsService = JobsService_1 = class JobsService {
    constructor(db, pipelineSeederService, auditService, logger, cache) {
        this.db = db;
        this.pipelineSeederService = pipelineSeederService;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(JobsService_1.name);
    }
    listKey(companyId) {
        return `jobs:${companyId}:list`;
    }
    oneKey(companyId, jobId) {
        return `jobs:${companyId}:job:${jobId}:detail`;
    }
    publicJobKey(jobId) {
        return `public:job:${jobId}:detail`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.companyId && opts.jobId)
            jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.jobId)));
        if (opts.jobId)
            jobs.push(this.cache.del(this.publicJobKey(opts.jobId)));
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:jobs');
    }
    async create(createDto, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, title: createDto?.title }, 'jobs:create:start');
        if (createDto.externalJobId) {
            const exists = await this.db
                .select({ id: job_postings_schema_1.job_postings.id })
                .from(job_postings_schema_1.job_postings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.externalJobId, createDto.externalJobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId)))
                .execute();
            if (exists.length > 0) {
                this.logger.warn({ companyId, externalJobId: createDto.externalJobId }, 'jobs:create:duplicate-externalId');
                throw new common_1.BadRequestException(`Job with external ID "${createDto.externalJobId}" already exists for this company.`);
            }
        }
        const [job] = await this.db
            .insert(job_postings_schema_1.job_postings)
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
            throw new common_1.BadRequestException('Failed to create job');
        }
        if (createDto.pipelineTemplateId) {
            await this.pipelineSeederService.cloneTemplateToJob(createDto.pipelineTemplateId, job.id);
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
    async postJob(jobId, user) {
        this.logger.info({ companyId: user.companyId, jobId }, 'jobs:post:start');
        const [job] = await this.db
            .select()
            .from(job_postings_schema_1.job_postings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, user.companyId)))
            .execute();
        if (!job) {
            this.logger.warn({ jobId }, 'jobs:post:not-found');
            throw new common_1.NotFoundException('Job not found');
        }
        if (job.status === 'open') {
            this.logger.warn({ jobId }, 'jobs:post:already-open');
            throw new common_1.BadRequestException('Job is already posted');
        }
        await this.db
            .update(job_postings_schema_1.job_postings)
            .set({ status: 'open', postedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, user.companyId)))
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
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'jobs:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: job_postings_schema_1.job_postings.id,
                title: job_postings_schema_1.job_postings.title,
                description: job_postings_schema_1.job_postings.description,
                status: job_postings_schema_1.job_postings.status,
                jobType: job_postings_schema_1.job_postings.jobType,
                employmentType: job_postings_schema_1.job_postings.employmentType,
                deadlineDate: job_postings_schema_1.job_postings.deadlineDate,
            })
                .from(job_postings_schema_1.job_postings)
                .where((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId))
                .orderBy((0, drizzle_orm_1.asc)(job_postings_schema_1.job_postings.createdAt))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'jobs:list:db:done');
            return rows;
        });
    }
    async findOne(jobId, companyId) {
        const key = this.oneKey(companyId, jobId);
        this.logger.debug({ key, companyId, jobId }, 'jobs:detail:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [job] = await this.db
                .select()
                .from(job_postings_schema_1.job_postings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId)))
                .execute();
            return job ?? null;
        });
        if (!row) {
            this.logger.warn({ companyId, jobId }, 'jobs:detail:not-found');
            throw new common_1.NotFoundException('Job not found');
        }
        return row;
    }
    async update(jobId, user, dto) {
        const { companyId, id } = user;
        this.logger.info({ companyId, jobId }, 'jobs:update:start');
        const [updated] = await this.db
            .update(job_postings_schema_1.job_postings)
            .set({ ...dto })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId)))
            .returning()
            .execute();
        if (!updated) {
            this.logger.warn({ companyId, jobId }, 'jobs:update:not-found');
            throw new common_1.NotFoundException('Job not found or update failed');
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
    async remove(jobId, user) {
        const { companyId, id } = user;
        this.logger.info({ companyId, jobId }, 'jobs:delete:start');
        await this.db
            .update(job_postings_schema_1.job_postings)
            .set({ isArchived: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId), (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId)))
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
    async publicJobs(options) {
        const { search, limit = 10, offset = 0, sortBy = 'createdAt', sortDirection = 'asc', jobType, employmentType, experienceLevel, location, status, salaryMin, salaryMax, } = options;
        const sortColumnMap = {
            title: job_postings_schema_1.job_postings.title,
            createdAt: job_postings_schema_1.job_postings.createdAt,
            deadlineDate: job_postings_schema_1.job_postings.deadlineDate,
        };
        const sortColumn = sortColumnMap[sortBy] || job_postings_schema_1.job_postings.createdAt;
        const sortFn = sortDirection === 'desc' ? drizzle_orm_1.desc : drizzle_orm_1.asc;
        const conditions = [];
        const condition = search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.title, `%${search}%`), (0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.description, `%${search}%`))
            : undefined;
        if (condition)
            conditions.push(condition);
        if (status) {
            const allowedStatuses = ['draft', 'open', 'closed', 'archived'];
            if (allowedStatuses.includes(status)) {
                conditions.push((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.status, status));
            }
        }
        if (jobType?.length) {
            const allowedJobTypes = ['onsite', 'remote', 'hybrid'];
            const filteredJobTypes = jobType.filter((jt) => allowedJobTypes.includes(jt));
            if (filteredJobTypes.length)
                conditions.push((0, drizzle_orm_1.inArray)(job_postings_schema_1.job_postings.jobType, filteredJobTypes));
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
            ];
            const filteredEmploymentTypes = employmentType.filter((et) => allowedEmploymentTypes.includes(et));
            if (filteredEmploymentTypes.length)
                conditions.push((0, drizzle_orm_1.inArray)(job_postings_schema_1.job_postings.employmentType, filteredEmploymentTypes));
        }
        if (experienceLevel?.length) {
            conditions.push((0, drizzle_orm_1.inArray)(job_postings_schema_1.job_postings.experienceLevel, experienceLevel));
        }
        if (location?.trim()) {
            conditions.push((0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.city, `%${location.toLowerCase()}%`));
        }
        if (salaryMin !== undefined)
            conditions.push((0, drizzle_orm_1.gte)(job_postings_schema_1.job_postings.salaryRangeTo, salaryMin));
        if (salaryMax !== undefined)
            conditions.push((0, drizzle_orm_1.lte)(job_postings_schema_1.job_postings.salaryRangeFrom, salaryMax));
        const today = new Date().toISOString();
        conditions.push((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.status, 'open'));
        conditions.push((0, drizzle_orm_1.gt)(job_postings_schema_1.job_postings.deadlineDate, today));
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const rows = await this.db
            .select({
            id: job_postings_schema_1.job_postings.id,
            title: job_postings_schema_1.job_postings.title,
            description: job_postings_schema_1.job_postings.description,
            status: job_postings_schema_1.job_postings.status,
            jobType: job_postings_schema_1.job_postings.jobType,
            employmentType: job_postings_schema_1.job_postings.employmentType,
            deadlineDate: job_postings_schema_1.job_postings.deadlineDate,
            createdAt: job_postings_schema_1.job_postings.createdAt,
            salaryRangeFrom: job_postings_schema_1.job_postings.salaryRangeFrom,
            salaryRangeTo: job_postings_schema_1.job_postings.salaryRangeTo,
            experiences: job_postings_schema_1.job_postings.experienceLevel,
            location: job_postings_schema_1.job_postings.city,
            companyName: schema_1.companies.name,
            companyLogo: schema_1.companies.logo_url,
            companyId: job_postings_schema_1.job_postings.companyId,
        })
            .from(job_postings_schema_1.job_postings)
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, schema_1.companies.id))
            .where(whereClause)
            .orderBy(sortFn(sortColumn))
            .limit(limit)
            .offset(offset)
            .execute();
        return rows;
    }
    async publicJob(jobId) {
        const key = this.publicJobKey(jobId);
        this.logger.debug({ key, jobId }, 'jobs:public:detail:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const [job] = await this.db
                .select()
                .from(job_postings_schema_1.job_postings)
                .where((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.id, jobId))
                .execute();
            return job ?? null;
        });
        if (!row) {
            this.logger.warn({ jobId }, 'jobs:public:detail:not-found');
            throw new common_1.NotFoundException('Job not found');
        }
        return row;
    }
    async publicCompanyJobs(options) {
        const { companyId, search, location } = options;
        this.logger.info({ companyId }, 'jobs:publicCompanyJobs:start');
        if (!companyId) {
            this.logger.warn({}, 'jobs:publicCompanyJobs:no-companyId');
            throw new Error('companyId is required');
        }
        const conditions = [];
        const condition = search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.title, `%${search}%`), (0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.description, `%${search}%`))
            : undefined;
        if (condition)
            conditions.push(condition);
        if (location?.trim()) {
            conditions.push((0, drizzle_orm_1.ilike)(job_postings_schema_1.job_postings.city, `%${location.toLowerCase()}%`));
        }
        const today = new Date().toISOString();
        conditions.push((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, companyId));
        conditions.push((0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.status, 'open'));
        conditions.push((0, drizzle_orm_1.gt)(job_postings_schema_1.job_postings.deadlineDate, today));
        const rows = await this.db
            .select({
            id: job_postings_schema_1.job_postings.id,
            title: job_postings_schema_1.job_postings.title,
            description: job_postings_schema_1.job_postings.description,
            status: job_postings_schema_1.job_postings.status,
            jobType: job_postings_schema_1.job_postings.jobType,
            employmentType: job_postings_schema_1.job_postings.employmentType,
            deadlineDate: job_postings_schema_1.job_postings.deadlineDate,
            createdAt: job_postings_schema_1.job_postings.createdAt,
            salaryRangeFrom: job_postings_schema_1.job_postings.salaryRangeFrom,
            salaryRangeTo: job_postings_schema_1.job_postings.salaryRangeTo,
            experiences: job_postings_schema_1.job_postings.experienceLevel,
            location: job_postings_schema_1.job_postings.city,
            companyName: schema_1.companies.name,
            companyLogo: schema_1.companies.logo_url,
        })
            .from(job_postings_schema_1.job_postings)
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(job_postings_schema_1.job_postings.companyId, schema_1.companies.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(job_postings_schema_1.job_postings.createdAt))
            .execute();
        this.logger.info({ companyId, count: rows.length }, 'jobs:publicCompanyJobs:done');
        return rows;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, pipeline_seeder_service_1.PipelineSeederService,
        audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map