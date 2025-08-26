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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_feedback_viewers_schema_1 = require("./schema/performance-feedback-viewers.schema");
const performance_feedback_schema_1 = require("./schema/performance-feedback.schema");
const audit_service_1 = require("../../audit/audit.service");
const performance_feedback_responses_schema_1 = require("./schema/performance-feedback-responses.schema");
const schema_1 = require("../../../drizzle/schema");
const performance_feedback_questions_schema_1 = require("./schema/performance-feedback-questions.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let FeedbackService = class FeedbackService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    tags(companyId) {
        return [`company:${companyId}:feedback`];
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async create(dto, user) {
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
            .returning()
            .execute();
        if (dto.responses?.length) {
            await this.db
                .insert(performance_feedback_responses_schema_1.feedbackResponses)
                .values(dto.responses.map((r) => ({
                feedbackId: newFeedback.id,
                question: r.questionId,
                answer: r.answer,
            })))
                .execute();
        }
        const viewerIds = await this.resolveViewerIds(dto.shareScope ??
            'private', dto.recipientId);
        if (viewerIds.length) {
            await this.db
                .insert(performance_feedback_viewers_schema_1.feedbackViewers)
                .values(viewerIds.map((viewerId) => ({
                feedbackId: newFeedback.id,
                userId: viewerId,
            })))
                .execute();
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
                isAnonymous: dto.isAnonymous ?? false,
            },
        });
        await this.invalidate(companyId);
        return newFeedback;
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
                const managerUserId = await getManagerUserId();
                return managerUserId ? [managerUserId] : [];
            }
            case 'person_managers': {
                const ids = [];
                if (recipient.userId)
                    ids.push(recipient.userId);
                const managerUserId = await getManagerUserId();
                if (managerUserId)
                    ids.push(managerUserId);
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
                    .filter((id) => !!id);
            }
        }
    }
    async getFeedbackForRecipient(recipientId, viewer) {
        const feedbacks = await this.db
            .select()
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, recipientId))
            .execute();
        const visibleFeedback = [];
        for (const fb of feedbacks) {
            const [viewerAccess] = await this.db
                .select()
                .from(performance_feedback_viewers_schema_1.feedbackViewers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.feedbackId, fb.id), (0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.userId, viewer.id)))
                .execute();
            if (!viewerAccess)
                continue;
            const responses = await this.db
                .select()
                .from(performance_feedback_responses_schema_1.feedbackResponses)
                .where((0, drizzle_orm_1.eq)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, fb.id))
                .execute();
            visibleFeedback.push({ ...fb, responses });
        }
        return visibleFeedback;
    }
    async getFeedbackBySender(senderId) {
        return this.db
            .select()
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.senderId, senderId))
            .execute();
    }
    async getResponsesForFeedback(feedbackIds) {
        if (!feedbackIds.length)
            return [];
        return this.db
            .select({
            feedbackId: performance_feedback_responses_schema_1.feedbackResponses.feedbackId,
            questionId: performance_feedback_responses_schema_1.feedbackResponses.question,
        })
            .from(performance_feedback_responses_schema_1.feedbackResponses)
            .where((0, drizzle_orm_1.inArray)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, feedbackIds))
            .execute();
    }
    async findAll(companyId, filters) {
        return this.cache.getOrSetVersioned(companyId, [
            'feedback',
            'list',
            filters?.type ?? 'all',
            filters?.departmentId ?? 'any',
        ], async () => {
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
                conditions.push((0, drizzle_orm_1.eq)(schema_1.departments.id, filters.departmentId));
            }
            const feedbacks = await this.db
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
                .execute();
            const feedbackIds = feedbacks.map((f) => f.id);
            const responses = await this.getResponsesForFeedback(feedbackIds);
            return feedbacks.map((f) => ({
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
                isArchived: f.isArchived,
            }));
        }, { tags: this.tags(companyId) });
    }
    async getCounts(companyId, expectedTypes = []) {
        const typeRows = await this.db
            .select({
            type: performance_feedback_schema_1.performanceFeedback.type,
            count: (0, drizzle_orm_1.sql) `cast(count(*) as int)`,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false)))
            .groupBy(performance_feedback_schema_1.performanceFeedback.type);
        const [totals] = await this.db
            .select({
            all: (0, drizzle_orm_1.sql) `cast(sum(case when ${performance_feedback_schema_1.performanceFeedback.isArchived} = false then 1 else 0 end) as int)`,
            archived: (0, drizzle_orm_1.sql) `cast(sum(case when ${performance_feedback_schema_1.performanceFeedback.isArchived} = true  then 1 else 0 end) as int)`,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId));
        const byType = {};
        for (const r of typeRows) {
            const key = (r.type ?? 'unknown');
            byType[key] = r.count ?? 0;
        }
        for (const t of expectedTypes) {
            if (!(t in byType))
                byType[t] = 0;
        }
        return {
            all: totals?.all ?? 0,
            archived: totals?.archived ?? 0,
            ...byType,
        };
    }
    async getCountsForEmployee(companyId, employeeId, expectedTypes = []) {
        const typeRows = await this.db
            .select({
            type: performance_feedback_schema_1.performanceFeedback.type,
            count: (0, drizzle_orm_1.sql) `cast(count(*) as int)`,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, employeeId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false)))
            .groupBy(performance_feedback_schema_1.performanceFeedback.type);
        const [totals] = await this.db
            .select({
            all: (0, drizzle_orm_1.sql) `cast(sum(case when ${performance_feedback_schema_1.performanceFeedback.isArchived} = false then 1 else 0 end) as int)`,
            archived: (0, drizzle_orm_1.sql) `cast(sum(case when ${performance_feedback_schema_1.performanceFeedback.isArchived} = true  then 1 else 0 end) as int)`,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, employeeId));
        const byType = {};
        for (const r of typeRows) {
            const key = (r.type ?? 'unknown');
            byType[key] = r.count ?? 0;
        }
        for (const t of expectedTypes) {
            if (!(t in byType))
                byType[t] = 0;
        }
        return {
            all: totals?.all ?? 0,
            archived: totals?.archived ?? 0,
            ...byType,
        };
    }
    async findAllByEmployeeId(companyId, employeeId, filters) {
        return this.cache.getOrSetVersioned(companyId, ['feedback', 'by-employee', employeeId, filters?.type ?? 'all'], async () => {
            if (!employeeId)
                return [];
            const [employee] = await this.db
                .select()
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
                .execute();
            if (!employee)
                return [];
            const baseCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.senderId, employee.userId), (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.recipientId, employeeId)), filters?.type === 'archived'
                ? (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, true)
                : (0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.isArchived, false));
            const conditions = [baseCondition];
            if (filters?.type &&
                filters.type !== 'all' &&
                filters.type !== 'archived') {
                conditions.push((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.type, filters.type));
            }
            const feedbacks = await this.db
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
                .execute();
            const feedbackIds = feedbacks.map((f) => f.id);
            const responses = await this.getResponsesForFeedback(feedbackIds);
            return feedbacks.map((f) => ({
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
                isArchived: f.isArchived,
            }));
        }, { tags: this.tags(companyId) });
    }
    async findOne(id, user) {
        const [item] = await this.db
            .select({
            id: performance_feedback_schema_1.performanceFeedback.id,
            companyId: performance_feedback_schema_1.performanceFeedback.companyId,
            type: performance_feedback_schema_1.performanceFeedback.type,
            createdAt: performance_feedback_schema_1.performanceFeedback.createdAt,
            isAnonymous: performance_feedback_schema_1.performanceFeedback.isAnonymous,
            employeeName: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            senderFirstName: schema_1.users.firstName,
            senderLastName: schema_1.users.lastName,
        })
            .from(performance_feedback_schema_1.performanceFeedback)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_feedback_schema_1.performanceFeedback.recipientId))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_feedback_schema_1.performanceFeedback.senderId))
            .execute();
        if (!item) {
            throw new common_1.NotFoundException('Feedback not found');
        }
        const [viewerAccess] = await this.db
            .select()
            .from(performance_feedback_viewers_schema_1.feedbackViewers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.feedbackId, id), (0, drizzle_orm_1.eq)(performance_feedback_viewers_schema_1.feedbackViewers.userId, user.id)))
            .execute();
        const allowedRoles = ['admin', 'super_admin'];
        const isPrivileged = allowedRoles.includes(user.role);
        if (!viewerAccess && !isPrivileged) {
            return 'You do not have permission to view this feedback';
        }
        const payload = await this.cache.getOrSetVersioned(item.companyId, ['feedback', 'one', id], async () => {
            const responses = await this.db
                .select({
                answer: performance_feedback_responses_schema_1.feedbackResponses.answer,
                questionText: performance_feedback_questions_schema_1.feedbackQuestions.question,
                inputType: performance_feedback_questions_schema_1.feedbackQuestions.inputType,
            })
                .from(performance_feedback_responses_schema_1.feedbackResponses)
                .where((0, drizzle_orm_1.eq)(performance_feedback_responses_schema_1.feedbackResponses.feedbackId, id))
                .leftJoin(performance_feedback_questions_schema_1.feedbackQuestions, (0, drizzle_orm_1.eq)(performance_feedback_responses_schema_1.feedbackResponses.question, performance_feedback_questions_schema_1.feedbackQuestions.id))
                .execute();
            const senderName = item.isAnonymous
                ? 'Anonymous'
                : `${item.senderFirstName ?? ''} ${item.senderLastName ?? ''}`.trim();
            return {
                id: item.id,
                type: item.type,
                createdAt: item.createdAt,
                isAnonymous: item.isAnonymous,
                employeeName: item.employeeName,
                senderName,
                responses,
            };
        }, { tags: this.tags(item.companyId) });
        return payload;
    }
    async update(id, updateFeedbackDto, user) {
        const current = await this.findOne(id, user);
        if (!current || typeof current === 'string') {
            return current;
        }
        const [updated] = await this.db
            .update(performance_feedback_schema_1.performanceFeedback)
            .set(updateFeedbackDto)
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'feedback',
            entityId: updated.id,
            userId: user.id,
            details: 'Feedback updated',
            changes: { ...updateFeedbackDto },
        });
        await this.invalidate(updated.companyId);
        return updated;
    }
    async remove(id, user) {
        const current = await this.findOne(id, user);
        if (!current || typeof current === 'string') {
            return current;
        }
        const [deleted] = await this.db
            .update(performance_feedback_schema_1.performanceFeedback)
            .set({ isArchived: true })
            .where((0, drizzle_orm_1.eq)(performance_feedback_schema_1.performanceFeedback.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'feedback',
            entityId: id,
            userId: user.id,
            details: 'Feedback deleted',
        });
        await this.invalidate(deleted.companyId);
        return deleted;
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map