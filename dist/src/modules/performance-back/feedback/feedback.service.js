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
var FeedbackService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const performance_feedback_viewers_schema_1 = require("./schema/performance-feedback-viewers.schema");
const performance_feedback_schema_1 = require("./schema/performance-feedback.schema");
const audit_service_1 = require("../../audit/audit.service");
const performance_feedback_responses_schema_1 = require("./schema/performance-feedback-responses.schema");
const schema_1 = require("../../../drizzle/schema");
const performance_feedback_questions_schema_1 = require("./schema/performance-feedback-questions.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let FeedbackService = FeedbackService_1 = class FeedbackService {
    constructor(db, auditService, logger, cache) {
        this.db = db;
        this.auditService = auditService;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(FeedbackService_1.name);
    }
    companyVersionKey(companyId) {
        return `fb:v:${companyId}`;
    }
    employeeVersionKey(companyId, employeeId) {
        return `fb:empv:${companyId}:${employeeId}`;
    }
    async getV(key) {
        const v = await this.cache.get(key);
        return v ?? 1;
    }
    async bumpV(key) {
        await this.cache.del(key);
    }
    async listKey(companyId, type, deptId) {
        const v = await this.getV(this.companyVersionKey(companyId));
        return `fb:v${v}:${companyId}:list:${type ?? 'all'}:${deptId ?? 'any'}`;
    }
    async empListKey(companyId, employeeId, type) {
        const v = await this.getV(this.employeeVersionKey(companyId, employeeId));
        return `fb:empv${v}:${companyId}:${employeeId}:list:${type ?? 'all'}`;
    }
    oneKey(companyId, id) {
        return `fb:${companyId}:one:${id}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.feedbackId) {
            jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.feedbackId)));
        }
        jobs.push(this.bumpV(this.companyVersionKey(opts.companyId)));
        if (opts.employeeId) {
            jobs.push(this.bumpV(this.employeeVersionKey(opts.companyId, opts.employeeId)));
        }
        if (opts.newEmployeeId && opts.newEmployeeId !== opts.employeeId) {
            jobs.push(this.bumpV(this.employeeVersionKey(opts.companyId, opts.newEmployeeId)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'feedback:cache:burst');
    }
    async getResponsesForFeedback(feedbackIds) {
        if (feedbackIds.length === 0)
            return [];
        return this.db
            .select({
            feedbackId: performance_feedback_responses_schema_1.feedbackResponses.feedbackId,
            questionId: performance_feedback_responses_schema_1.feedbackResponses.question,
        })
            .from(performance_feedback_responses_schema_1.feedbackResponses)
            .where((0, drizzle_orm_1.inArray)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, feedbackIds));
    }
    async resolveViewerIds(scope, recipientId) {
        const [recipient] = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, recipientId))
            .execute();
        if (!recipient)
            return [];
        const getManagerUserId = async () => {
            if (recipient.managerId) {
                const [manager] = await this.db
                    .select()
                    .from(schema_1.employees)
                    .where((0, drizzle_orm_1.eq)(schema_1.employees.id, recipient.managerId))
                    .execute();
                if (manager?.userId)
                    return manager.userId;
            }
            const [superAdmin] = await this.db
                .select({ id: schema_1.users.id })
                .from(schema_1.users)
                .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, recipient.companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, 'super_admin')))
                .limit(1)
                .execute();
            return superAdmin?.id ?? null;
        };
        switch (scope) {
            case 'private':
                return recipient.userId ? [recipient.userId] : [];
            case 'managers': {
                const m = await getManagerUserId();
                return m ? [m] : [];
            }
            case 'person_managers': {
                const ids = [];
                if (recipient.userId)
                    ids.push(recipient.userId);
                const m = await getManagerUserId();
                if (m)
                    ids.push(m);
                return ids;
            }
            case 'team': {
                if (!recipient.departmentId)
                    return [];
                const teammates = await this.db.query.employees.findMany({
                    where: (e, { eq }) => eq(e.departmentId, recipient.departmentId),
                });
                return teammates
                    .map((t) => t.userId)
                    .filter((id) => !!id && id !== recipient.userId);
            }
            default:
                return [];
        }
    }
    async create(dto, user) {
        this.logger.info({ companyId: user.companyId, dtoType: dto.type }, 'feedback:create:start');
        const { companyId, id: userId } = user;
        const [newFeedback] = await this.db
            .insert(performance_feedback_schema_1.performanceFeedback)
            .values({
            senderId: userId,
            recipientId: dto.recipientId,
            type: dto.type,
            isAnonymous: dto.isAnonymous ?? false,
            companyId,
        })
            .returning();
        if (dto.responses?.length) {
            await this.db.insert(performance_feedback_responses_schema_1.feedbackResponses).values(dto.responses.map((r) => ({
                feedbackId: newFeedback.id,
                question: r.questionId,
                answer: r.answer,
            })));
        }
        const viewerIds = await this.resolveViewerIds(dto.shareScope, dto.recipientId);
        if (viewerIds.length) {
            await this.db.insert(performance_feedback_viewers_schema_1.feedbackViewers).values(viewerIds.map((viewerId) => ({
                feedbackId: newFeedback.id,
                userId: viewerId,
            })));
        }
        await this.auditService.logAction({
            action: 'create',
            entity: 'feedback',
            entityId: newFeedback.id,
            userId,
            details: 'Feedback created',
            changes: {
                feedbackId: newFeedback.id,
                recipientId: dto.recipientId,
                type: dto.type,
                isAnonymous: dto.isAnonymous,
            },
        });
        await this.burst({
            companyId,
            feedbackId: newFeedback.id,
            employeeId: dto.recipientId,
        });
        this.logger.info({ id: newFeedback.id }, 'feedback:create:done');
        return newFeedback;
    }
    async update(id, updateFeedbackDto, user) {
        this.logger.info({ id, userId: user.id }, 'feedback:update:start');
        const current = await this.findOne(id, user);
        const [updated] = await this.db
            .update(performance_feedback_schema_1.performanceFeedback)
            .set(updateFeedbackDto)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'feedback',
            entityId: updated.id,
            userId: user.id,
            details: 'Feedback updated',
            changes: { ...updateFeedbackDto },
        });
        const oldRecipientId = current?.recipientId;
        const newRecipientId = updateFeedbackDto?.recipientId;
        await this.burst({
            companyId: user.companyId,
            feedbackId: id,
            employeeId: oldRecipientId,
            newEmployeeId: newRecipientId,
        });
        this.logger.info({ id }, 'feedback:update:done');
        return updated;
    }
    async remove(id, user) {
        this.logger.info({ id, userId: user.id }, 'feedback:remove:start');
        const current = await this.findOne(id, user);
        const [deleted] = await this.db
            .update(performance_feedback_schema_1.performanceFeedback)
            .set({ isArchived: true })
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'feedback',
            entityId: id,
            userId: user.id,
            details: 'Feedback deleted',
        });
        await this.burst({
            companyId: user.companyId,
            feedbackId: id,
            employeeId: current?.recipientId,
        });
        this.logger.info({ id }, 'feedback:remove:done');
        return deleted;
    }
    async getFeedbackForRecipient(recipientId, viewer) {
        this.logger.debug({ recipientId, viewerId: viewer.id }, 'feedback:getForRecipient:start');
        const feedbacks = await this.db
            .select()
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, recipientId));
        if (feedbacks.length === 0)
            return [];
        const ids = feedbacks.map((f) => f.id);
        const allowedLinks = await this.db
            .select({ feedbackId: performance_feedback_viewers_schema_1.feedbackViewers.feedbackId })
            .from(performance_feedback_viewers_schema_1.feedbackViewers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(performance_feedback_viewers_schema_1.feedbackViewers.feedbackId, ids), (0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.userId, viewer.id)));
        const allowedIds = new Set(allowedLinks.map((a) => a.feedbackId));
        const visible = feedbacks.filter((f) => allowedIds.has(f.id));
        if (visible.length === 0)
            return [];
        const allResponses = await this.db
            .select()
            .from(performance_feedback_responses_schema_1.feedbackResponses)
            .where((0, drizzle_orm_1.inArray)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, visible.map((v) => v.id)));
        const byFeedback = new Map();
        for (const r of allResponses) {
            const arr = byFeedback.get(r.feedbackId) ?? [];
            arr.push(r);
            byFeedback.set(r.feedbackId, arr);
        }
        const out = visible.map((f) => ({
            ...f,
            responses: byFeedback.get(f.id) ?? [],
        }));
        this.logger.debug({ recipientId, count: out.length }, 'feedback:getForRecipient:done');
        return out;
    }
    async getFeedbackBySender(senderId) {
        this.logger.debug({ senderId }, 'feedback:getBySender:start');
        const rows = await this.db
            .select()
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.senderId, senderId));
        this.logger.debug({ senderId, count: rows.length }, 'feedback:getBySender:done');
        return rows;
    }
    async findAll(companyId, filters) {
        const key = await this.listKey(companyId, filters?.type, filters?.departmentId);
        this.logger.debug({ companyId, key, filters }, 'feedback:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const conditions = [
                (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId),
                filters?.type === 'archived'
                    ? (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, true)
                    : (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false),
            ];
            if (filters?.type &&
                filters.type !== 'all' &&
                filters.type !== 'archived') {
                conditions.push((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.type, filters.type));
            }
            if (filters?.departmentId) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.employees.departmentId, filters.departmentId));
            }
            const feedbacksRows = await this.db
                .select({
                id: performance_feedback_schema_1.performanceFeedback.id,
                type: performance_feedback_schema_1.performanceFeedback.type,
                createdAt: performance_feedback_schema_1.performanceFeedback.createdAt,
                isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
                isArchived: performance_feedback_schema_1.performanceFeedback.isArchived,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                senderFirstName: schema_1.users.firstName,
                senderLastName: schema_1.users.lastName,
                departmentName: schema_1.departments.name,
                departmentId: schema_1.departments.id,
                jobRoleName: schema_1.jobRoles.title,
            })
                .from(performance_feedback_schema_1.performanceFeedback)
                .where((0, drizzle_orm_1.and)(...conditions))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_feedback_schema_1.performanceFeedback.recipientId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_feedback_schema_1.performanceFeedback.senderId))
                .orderBy((0, drizzle_orm_1.desc)(performance_feedback_schema_1.performanceFeedback.createdAt));
            const feedbackIds = feedbacksRows.map((f) => f.id);
            const responses = await this.getResponsesForFeedback(feedbackIds);
            const mapped = feedbacksRows.map((f) => ({
                id: f.id,
                type: f.type,
                createdAt: f.createdAt,
                employeeName: f.employeeName,
                senderName: f.isAnonymous
                    ? 'Anonymous'
                    : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
                questionsCount: responses.filter((r) => r.feedbackId === f.id).length,
                departmentName: f.departmentName,
                jobRoleName: f.jobRoleName,
                departmentId: f.departmentId,
            }));
            this.logger.debug({ companyId, count: mapped.length }, 'feedback:findAll:db:done');
            return mapped;
        });
    }
    async findAllByEmployeeId(companyId, employeeId, filters) {
        const key = await this.empListKey(companyId, employeeId, filters?.type);
        this.logger.debug({ companyId, employeeId, key, filters }, 'feedback:findAllByEmp:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            if (!employeeId)
                return [];
            const [employee] = await this.db
                .select()
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)));
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found in company');
            }
            const baseCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.senderId, employee.userId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, employeeId)), filters?.type === 'archived'
                ? (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, true)
                : (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false));
            const conditions = [baseCondition];
            if (filters?.type &&
                filters.type !== 'all' &&
                filters.type !== 'archived') {
                conditions.push((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.type, filters.type));
            }
            const rows = await this.db
                .select({
                id: performance_feedback_schema_1.performanceFeedback.id,
                type: performance_feedback_schema_1.performanceFeedback.type,
                createdAt: performance_feedback_schema_1.performanceFeedback.createdAt,
                isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
                isArchived: performance_feedback_schema_1.performanceFeedback.isArchived,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                senderFirstName: schema_1.users.firstName,
                senderLastName: schema_1.users.lastName,
                departmentName: schema_1.departments.name,
                departmentId: schema_1.departments.id,
                jobRoleName: schema_1.jobRoles.title,
            })
                .from(performance_feedback_schema_1.performanceFeedback)
                .where((0, drizzle_orm_1.and)(...conditions))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_feedback_schema_1.performanceFeedback.recipientId))
                .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
                .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_feedback_schema_1.performanceFeedback.senderId))
                .orderBy((0, drizzle_orm_1.desc)(performance_feedback_schema_1.performanceFeedback.createdAt));
            const ids = rows.map((f) => f.id);
            const responseCounts = await this.getResponsesForFeedback(ids);
            const mapped = rows.map((f) => ({
                id: f.id,
                type: f.type,
                createdAt: f.createdAt,
                employeeName: f.employeeName,
                senderName: f.isAnonymous
                    ? 'Anonymous'
                    : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
                questionsCount: responseCounts.filter((r) => r.feedbackId === f.id)
                    .length,
                departmentName: f.departmentName,
                jobRoleName: f.jobRoleName,
                departmentId: f.departmentId,
                isArchived: f.isArchived,
            }));
            this.logger.debug({ companyId, employeeId, count: mapped.length }, 'feedback:findAllByEmp:db:done');
            return mapped;
        });
    }
    async findOne(id, user) {
        const key = this.oneKey(user.companyId, id);
        this.logger.debug({ id, key }, 'feedback:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [item] = await this.db
                .select({
                id: performance_feedback_schema_1.performanceFeedback.id,
                type: performance_feedback_schema_1.performanceFeedback.type,
                createdAt: performance_feedback_schema_1.performanceFeedback.createdAt,
                isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
                recipientId: performance_feedback_schema_1.performanceFeedback.recipientId,
                employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                senderName: (0, drizzle_orm_1.sql) `concat(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(performance_feedback_schema_1.performanceFeedback)
                .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
                .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_feedback_schema_1.performanceFeedback.recipientId))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_feedback_schema_1.performanceFeedback.senderId));
            if (!item) {
                this.logger.warn({ id }, 'feedback:findOne:not-found');
                throw new common_1.NotFoundException('Feedback not found');
            }
            const [viewerAccess] = await this.db
                .select()
                .from(performance_feedback_viewers_schema_1.feedbackViewers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.feedbackId, id), (0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.userId, user.id)));
            const allowedRoles = ['admin', 'super_admin'];
            const isPrivileged = allowedRoles.includes(user.role);
            if (!viewerAccess && !isPrivileged) {
                this.logger.warn({ id, userId: user.id }, 'feedback:findOne:forbidden');
                throw new common_1.ForbiddenException('You do not have permission to view this feedback');
            }
            const responses = await this.db
                .select({
                answer: performance_feedback_responses_schema_1.feedbackResponses.answer,
                questionText: performance_feedback_questions_schema_1.feedbackQuestions.question,
                inputType: performance_feedback_questions_schema_1.feedbackQuestions.inputType,
            })
                .from(performance_feedback_responses_schema_1.feedbackResponses)
                .where((0, drizzle_orm_1.eq)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, item.id))
                .leftJoin(performance_feedback_questions_schema_1.feedbackQuestions, (0, drizzle_orm_1.eq)(performance_feedback_responses_schema_1.feedbackResponses.question, performance_feedback_questions_schema_1.feedbackQuestions.id));
            const result = { ...item, responses };
            this.logger.debug({ id }, 'feedback:findOne:db:done');
            return result;
        });
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = FeedbackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map