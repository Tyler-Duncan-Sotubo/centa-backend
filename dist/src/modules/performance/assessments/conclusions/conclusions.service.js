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
exports.AssessmentConclusionsService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_assessment_conclusions_schema_1 = require("../schema/performance-assessment-conclusions.schema");
const performance_assessments_schema_1 = require("../schema/performance-assessments.schema");
const schema_1 = require("../../../../drizzle/schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let AssessmentConclusionsService = class AssessmentConclusionsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async createConclusion(assessmentId, dto, authorId) {
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        const isReviewer = assessment.reviewerId === authorId;
        const isHR = await this.isHR(authorId);
        if (!isReviewer && !isHR) {
            throw new common_1.ForbiddenException('Not authorized to submit this conclusion');
        }
        const [existing] = await this.db
            .select({ assessmentId: performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId })
            .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .limit(1);
        if (existing)
            throw new common_1.BadRequestException('Conclusion already exists');
        const now = new Date();
        const [created] = await this.db
            .insert(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .values({
            assessmentId,
            ...dto,
            reviewStatus: 'draft',
            createdAt: now,
            updatedAt: now,
        })
            .returning();
        await this.invalidate(assessment.companyId);
        return created;
    }
    async updateConclusion(assessmentId, dto, authorId) {
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        const conclusion = await this.getConclusionOrThrow(assessmentId);
        if (conclusion.reviewStatus === 'approved') {
            throw new common_1.BadRequestException('Conclusion is approved and cannot be edited');
        }
        const isReviewer = assessment.reviewerId === authorId;
        const isHR = await this.isHR(authorId);
        if (conclusion.reviewStatus === 'draft' ||
            conclusion.reviewStatus === 'needs_changes') {
            if (!isReviewer) {
                throw new common_1.ForbiddenException('Only the line manager can edit at this stage');
            }
        }
        else if (conclusion.reviewStatus === 'pending_hr') {
            if (!isHR) {
                throw new common_1.ForbiddenException('Only HR can edit at this stage');
            }
        }
        else {
            throw new common_1.BadRequestException('Invalid review status');
        }
        const [updated] = await this.db
            .update(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .returning();
        await this.invalidate(assessment.companyId);
        return updated;
    }
    async submitConclusionToHR(assessmentId, authorId) {
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        const conclusion = await this.getConclusionOrThrow(assessmentId);
        if (assessment.reviewerId !== authorId) {
            throw new common_1.ForbiddenException('Only the line manager can submit to HR');
        }
        if (!['draft', 'needs_changes'].includes(conclusion.reviewStatus)) {
            throw new common_1.BadRequestException('Conclusion is not ready to submit to HR');
        }
        const [updated] = await this.db
            .update(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .set({
            reviewStatus: 'pending_hr',
            submittedToHrAt: new Date(),
            submittedToHrBy: authorId,
            changesRequestedAt: null,
            changesRequestedBy: null,
            changesRequestNote: null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .returning();
        await this.db
            .update(performance_assessments_schema_1.performanceAssessments)
            .set({ status: 'submitted', submittedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId));
        await this.invalidate(assessment.companyId);
        return updated;
    }
    async requestChanges(assessmentId, note, authorId) {
        if (!note?.trim())
            throw new common_1.BadRequestException('A note is required');
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        const conclusion = await this.getConclusionOrThrow(assessmentId);
        const isHR = await this.isHR(authorId);
        if (!isHR)
            throw new common_1.ForbiddenException('Only HR can request changes');
        if (conclusion.reviewStatus !== 'pending_hr') {
            throw new common_1.BadRequestException('Conclusion is not pending HR review');
        }
        const [updated] = await this.db
            .update(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .set({
            reviewStatus: 'needs_changes',
            changesRequestedAt: new Date(),
            changesRequestedBy: authorId,
            changesRequestNote: note.trim(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .returning();
        await this.invalidate(assessment.companyId);
        return updated;
    }
    async approveConclusion(assessmentId, authorId) {
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        const conclusion = await this.getConclusionOrThrow(assessmentId);
        const isHR = await this.isHR(authorId);
        if (!isHR)
            throw new common_1.ForbiddenException('Only HR can approve');
        if (conclusion.reviewStatus !== 'pending_hr') {
            throw new common_1.BadRequestException('Conclusion is not pending HR review');
        }
        const [approved] = await this.db
            .update(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .set({
            reviewStatus: 'approved',
            hrApprovedAt: new Date(),
            hrApprovedBy: authorId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .returning();
        await this.invalidate(assessment.companyId);
        return approved;
    }
    async getConclusionByAssessment(assessmentId) {
        const assessment = await this.getAssessmentOrThrow(assessmentId);
        return this.cache.getOrSetVersioned(assessment.companyId, ['assessments', 'conclusion', assessmentId], async () => {
            const [conclusion] = await this.db
                .select()
                .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
                .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
                .limit(1);
            if (!conclusion)
                throw new common_1.NotFoundException('Conclusion not found');
            return conclusion;
        });
    }
    async getAssessmentOrThrow(assessmentId) {
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId))
            .limit(1);
        if (!assessment)
            throw new common_1.NotFoundException('Assessment not found');
        return assessment;
    }
    async getConclusionOrThrow(assessmentId) {
        const [conclusion] = await this.db
            .select()
            .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .limit(1);
        if (!conclusion)
            throw new common_1.NotFoundException('Conclusion not found');
        return conclusion;
    }
    async isHR(userId) {
        const [row] = await this.db
            .select({ roleName: schema_1.companyRoles.name })
            .from(schema_1.users)
            .leftJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.users.companyRoleId))
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        const role = row?.roleName ?? '';
        return role === 'hr_manager' || role === 'admin' || role === 'super_admin';
    }
};
exports.AssessmentConclusionsService = AssessmentConclusionsService;
exports.AssessmentConclusionsService = AssessmentConclusionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], AssessmentConclusionsService);
//# sourceMappingURL=conclusions.service.js.map