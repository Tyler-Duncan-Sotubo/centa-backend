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
let AssessmentConclusionsService = class AssessmentConclusionsService {
    constructor(db) {
        this.db = db;
    }
    async createConclusion(assessmentId, dto, authorId) {
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId));
        if (!assessment) {
            throw new common_1.NotFoundException('Assessment not found');
        }
        if (assessment.reviewerId !== authorId && !this.isHR(authorId)) {
            throw new common_1.ForbiddenException('Not authorized to submit this conclusion');
        }
        const [existing] = await this.db
            .select()
            .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId));
        if (existing) {
            throw new common_1.BadRequestException('Conclusion already exists');
        }
        const [created] = await this.db
            .insert(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .values({
            assessmentId,
            ...dto,
            createdAt: new Date(),
        })
            .returning();
        if (created) {
            await this.db
                .update(performance_assessments_schema_1.performanceAssessments)
                .set({ status: 'submitted' })
                .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId));
        }
        return created;
    }
    async updateConclusion(assessmentId, dto, authorId) {
        const [conclusion] = await this.db
            .select()
            .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId));
        if (!conclusion) {
            throw new common_1.NotFoundException('Conclusion not found');
        }
        const [assessment] = await this.db
            .select()
            .from(performance_assessments_schema_1.performanceAssessments)
            .where((0, drizzle_orm_1.eq)(performance_assessments_schema_1.performanceAssessments.id, assessmentId));
        if (assessment?.reviewerId !== authorId && !this.isHR(authorId)) {
            throw new common_1.ForbiddenException('Not authorized to update this conclusion');
        }
        const [updated] = await this.db
            .update(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId))
            .returning();
        return updated;
    }
    async getConclusionByAssessment(assessmentId) {
        const [conclusion] = await this.db
            .select()
            .from(performance_assessment_conclusions_schema_1.assessmentConclusions)
            .where((0, drizzle_orm_1.eq)(performance_assessment_conclusions_schema_1.assessmentConclusions.assessmentId, assessmentId));
        if (!conclusion) {
            throw new common_1.NotFoundException('Conclusion not found');
        }
        return conclusion;
    }
    async isHR(userId) {
        const [userRole] = await this.db
            .select()
            .from(schema_1.companyRoles)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.companyId, schema_1.companyRoles.companyId))
            .where((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, userId));
        return (userRole?.company_roles?.name === 'hr_manager' ||
            userRole?.company_roles?.name === 'admin' ||
            userRole?.company_roles?.name === 'super_admin');
    }
};
exports.AssessmentConclusionsService = AssessmentConclusionsService;
exports.AssessmentConclusionsService = AssessmentConclusionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AssessmentConclusionsService);
//# sourceMappingURL=conclusions.service.js.map