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
exports.FeedbackQuestionService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const performance_feedback_questions_schema_1 = require("../schema/performance-feedback-questions.schema");
let FeedbackQuestionService = class FeedbackQuestionService {
    constructor(db) {
        this.db = db;
    }
    async create(dto, user) {
        const [question] = await this.db
            .insert(performance_feedback_questions_schema_1.feedbackQuestions)
            .values({
            companyId: user.companyId,
            question: dto.question,
            type: dto.type,
            order: dto.order,
            inputType: dto.inputType,
        })
            .returning();
        return question;
    }
    async findAll() {
        return this.db.select().from(performance_feedback_questions_schema_1.feedbackQuestions);
    }
    async findByType(type) {
        return this.db
            .select()
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, type));
    }
    async findOne(id) {
        const [question] = await this.db
            .select()
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id));
        if (!question) {
            throw new common_1.NotFoundException('Question not found');
        }
        return question;
    }
    async update(id, dto) {
        const [updated] = await this.db
            .update(performance_feedback_questions_schema_1.feedbackQuestions)
            .set(dto)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id))
            .returning();
        if (!updated) {
            throw new common_1.NotFoundException('Question not found');
        }
        return updated;
    }
    async delete(id) {
        const [existing] = await this.db
            .select()
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id));
        if (!existing) {
            throw new common_1.NotFoundException('Question not found');
        }
        const countRes = await this.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, existing.type));
        const remainingCount = Number(countRes[0]?.count ?? 0);
        if (remainingCount <= 1) {
            throw new common_1.BadRequestException(`Cannot delete the last question of type "${existing.type}"`);
        }
        await this.db.delete(performance_feedback_questions_schema_1.feedbackQuestions).where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id));
        const remaining = await this.db
            .select()
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.type, existing.type))
            .orderBy(performance_feedback_questions_schema_1.feedbackQuestions.order);
        for (let i = 0; i < remaining.length; i++) {
            const q = remaining[i];
            if (q.order !== i) {
                await this.db
                    .update(performance_feedback_questions_schema_1.feedbackQuestions)
                    .set({ order: i })
                    .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, q.id));
            }
        }
        return { message: 'Question deleted and reordered' };
    }
    async reorderQuestionsByType(type, newOrder) {
        const ids = newOrder.map((q) => q.id);
        const existing = await this.db
            .select({ id: performance_feedback_questions_schema_1.feedbackQuestions.id })
            .from(performance_feedback_questions_schema_1.feedbackQuestions)
            .where((0, drizzle_orm_1.inArray)(performance_feedback_questions_schema_1.feedbackQuestions.id, ids));
        const existingIds = new Set(existing.map((e) => e.id));
        const invalidIds = ids.filter((id) => !existingIds.has(id));
        if (invalidIds.length > 0) {
            throw new common_1.BadRequestException(`Invalid question IDs for type '${type}': ${invalidIds.join(', ')}`);
        }
        for (const { id, order } of newOrder) {
            await this.db
                .update(performance_feedback_questions_schema_1.feedbackQuestions)
                .set({ order })
                .where((0, drizzle_orm_1.eq)(performance_feedback_questions_schema_1.feedbackQuestions.id, id));
        }
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
        const insertData = defaults.flatMap(({ type, questions }) => questions.map((question, index) => ({
            companyId,
            question,
            type,
            order: index,
            isActive: true,
        })));
        await this.db.insert(performance_feedback_questions_schema_1.feedbackQuestions).values(insertData);
    }
};
exports.FeedbackQuestionService = FeedbackQuestionService;
exports.FeedbackQuestionService = FeedbackQuestionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], FeedbackQuestionService);
//# sourceMappingURL=feedback-question.service.js.map