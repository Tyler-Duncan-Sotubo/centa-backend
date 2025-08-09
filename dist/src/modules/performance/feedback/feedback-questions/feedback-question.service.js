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
var FeedbackQuestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackQuestionService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const performance_feedback_questions_schema_1 = require("../schema/performance-feedback-questions.schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
const nestjs_pino_1 = require("nestjs-pino");
let FeedbackQuestionService = FeedbackQuestionService_1 = class FeedbackQuestionService {
    constructor(db, cache, logger) {
        this.db = db;
        this.cache = cache;
        this.logger = logger;
        this.logger.setContext(FeedbackQuestionService_1.name);
    }
    listKey(companyId) {
        return `fbq:${companyId}:all`;
    }
    typeKey(companyId, type) {
        return `fbq:${companyId}:type:${type}`;
    }
    oneKey(companyId, id) {
        return `fbq:${companyId}:id:${id}`;
    }
    async burst(companyId, ids = [], types = []) {
        const jobs = [this.cache.del(this.listKey(companyId))];
        types.forEach((t) => jobs.push(this.cache.del(this.typeKey(companyId, t))));
        ids.forEach((id) => jobs.push(this.cache.del(this.oneKey(companyId, id))));
        await Promise.allSettled(jobs);
        this.logger.debug({ companyId, ids, types }, 'feedback-questions:cache:burst');
    }
    async create(dto, user) {
        const companyId = user.companyId;
        const [dup] = await this.db
            .select({ id: performance_feedback_questions_schema_1.feedbackQuestions.id })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, dto.type), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.question, dto.question.trim())))
            .limit(1);
        if (dup) {
            throw new common_1.BadRequestException('A question with the same text already exists for this type.');
        }
        let order = dto.order;
        if (order == null) {
            const [cnt] = await this.db
                .select({ c: (0, drizzle_orm_1.count)() })
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, dto.type)));
            order = Number(cnt?.c ?? 0);
        }
        const [question] = await this.db
            .insert(performance_feedback_questions_schema_1.feedbackQuestions)
            .values({
            companyId,
            question: dto.question.trim(),
            type: dto.type,
            order,
            inputType: dto.inputType,
        })
            .returning();
        await this.burst(companyId, [question.id], [dto.type]);
        return question;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId))
                .orderBy((0, drizzle_orm_1.asc)(performance_feedback_questions_schema_1.feedbackQuestions.type), (0, drizzle_orm_1.asc)(performance_feedback_questions_schema_1.feedbackQuestions.order));
            return rows;
        });
    }
    async findByType(companyId, type) {
        const key = this.typeKey(companyId, type);
        return this.cache.getOrSetCache(key, async () => {
            return this.db
                .select()
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, type)))
                .orderBy((0, drizzle_orm_1.asc)(performance_feedback_questions_schema_1.feedbackQuestions.order));
        });
    }
    async findOne(companyId, id) {
        const key = this.oneKey(companyId, id);
        return this.cache.getOrSetCache(key, async () => {
            const [question] = await this.db
                .select()
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id)));
            if (!question)
                throw new common_1.NotFoundException('Question not found');
            return question;
        });
    }
    async update(companyId, id, dto) {
        const existing = await this.findOne(companyId, id);
        if (dto.question || dto.type) {
            const newType = dto.type ?? existing.type;
            const newText = (dto.question ?? existing.question).trim();
            const [dup] = await this.db
                .select({ id: performance_feedback_questions_schema_1.feedbackQuestions.id })
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, newType), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.question, newText), (0, drizzle_orm_1.sql) `NOT (${(0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id)})`))
                .limit(1);
            if (dup) {
                throw new common_1.BadRequestException('A question with the same text already exists for this type.');
            }
        }
        const [updated] = await this.db
            .update(performance_feedback_questions_schema_1.feedbackQuestions)
            .set({
            question: dto.question?.trim() ?? existing.question,
            type: dto.type ?? existing.type,
            order: dto.order ?? existing.order,
            inputType: dto.inputType ?? existing.inputType,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id)))
            .returning();
        if (!updated)
            throw new common_1.NotFoundException('Question not found');
        const typesToBurst = Array.from(new Set([existing.type, updated.type]));
        await this.burst(companyId, [id], typesToBurst);
        return updated;
    }
    async delete(companyId, id) {
        const [existing] = await this.db
            .select()
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id)));
        if (!existing)
            throw new common_1.NotFoundException('Question not found');
        const [cnt] = await this.db
            .select({ c: (0, drizzle_orm_1.count)() })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, existing.type)));
        const remainingCount = Number(cnt?.c ?? 0);
        if (remainingCount <= 1) {
            throw new common_1.BadRequestException(`Cannot delete the last question of type "${existing.type}"`);
        }
        await this.db.transaction(async (trx) => {
            await trx.delete(performance_feedback_questions_schema_1.feedbackQuestions).where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id));
            const remaining = await trx
                .select()
                .from(performance_feedback_questions_schema_1.feedbackQuestions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, existing.type)))
                .orderBy((0, drizzle_orm_1.asc)(performance_feedback_questions_schema_1.feedbackQuestions.order));
            for (let i = 0; i < remaining.length; i++) {
                const q = remaining[i];
                if (q.order !== i) {
                    await trx
                        .update(performance_feedback_questions_schema_1.feedbackQuestions)
                        .set({ order: i })
                        .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, q.id));
                }
            }
        });
        await this.burst(companyId, [id], [existing.type]);
        return { message: 'Question deleted and reordered' };
    }
    async reorderQuestionsByType(companyId, type, newOrder) {
        const ids = newOrder.map((q) => q.id);
        const existing = await this.db
            .select({ id: performance_feedback_questions_schema_1.feedbackQuestions.id })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, type), (0, drizzle_orm_1.inArray)(performance_feedback_questions_schema_1.feedbackQuestions.id, ids)));
        const existingIds = new Set(existing.map((e) => e.id));
        const invalidIds = ids.filter((id) => !existingIds.has(id));
        if (invalidIds.length > 0) {
            throw new common_1.BadRequestException(`Invalid question IDs for type '${type}': ${invalidIds.join(', ')}`);
        }
        await this.db.transaction(async (trx) => {
            for (const { id, order } of newOrder) {
                await trx
                    .update(performance_feedback_questions_schema_1.feedbackQuestions)
                    .set({ order })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id)));
            }
        });
        await this.burst(companyId, ids, [type]);
        return { message: `Order updated for ${newOrder.length} questions.` };
    }
    async seedFeedbackQuestions(companyId) {
        const defaults = [
            {
                type: 'self',
                questions: [
                    'What are some things I do well?',
                    'How can I improve?',
                    'How well does the company recognize my values?',
                ],
            },
            {
                type: 'peer',
                questions: [
                    'Where does this person perform well?',
                    'How can this person improve?',
                    'Do you have additional feedback?',
                ],
            },
            {
                type: 'manager_to_employee',
                questions: [
                    'What are the employee’s strengths?',
                    'What areas need improvement?',
                    'Is the employee meeting expectations?',
                ],
            },
            {
                type: 'employee_to_manager',
                questions: [
                    'How does the manager support your work?',
                    'Where can the manager improve?',
                    'Do you feel heard and supported?',
                ],
            },
        ];
        const [cnt] = await this.db
            .select({ c: (0, drizzle_orm_1.count)() })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.companyId, companyId));
        if (Number(cnt?.c ?? 0) > 0) {
            throw new common_1.BadRequestException('Feedback questions already seeded for this company.');
        }
        const insertData = defaults.flatMap(({ type, questions }) => questions.map((question, index) => ({
            companyId,
            question,
            type,
            order: index,
            isActive: true,
        })));
        await this.db.insert(performance_feedback_questions_schema_1.feedbackQuestions).values(insertData);
        await this.burst(companyId, [], Array.from(new Set(insertData.map((i) => i.type))));
        return { message: 'Seeded feedback questions' };
    }
};
exports.FeedbackQuestionService = FeedbackQuestionService;
exports.FeedbackQuestionService = FeedbackQuestionService = FeedbackQuestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], FeedbackQuestionService);
//# sourceMappingURL=feedback-question.service.js.map