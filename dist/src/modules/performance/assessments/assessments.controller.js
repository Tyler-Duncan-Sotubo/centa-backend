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
exports.AssessmentsController = void 0;
const common_1 = require("@nestjs/common");
const assessments_service_1 = require("./assessments.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const create_assessment_dto_1 = require("./dto/create-assessment.dto");
const submit_assessment_dto_1 = require("./dto/submit-assessment.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const get_dashboard_assessments_dto_1 = require("./dto/get-dashboard-assessments.dto");
let AssessmentsController = class AssessmentsController extends base_controller_1.BaseController {
    constructor(assessmentsService) {
        super();
        this.assessmentsService = assessmentsService;
    }
    create(dto, user) {
        return this.assessmentsService.createAssessment(dto, user);
    }
    start(id, user) {
        return this.assessmentsService.startAssessment(id, user.id);
    }
    submit(id, dto, user) {
        return this.assessmentsService.saveSectionComments(id, user.id, dto);
    }
    getDashboard(user, filters) {
        return this.assessmentsService.getAssessmentsForDashboard(user.companyId, filters);
    }
    getCounts(user) {
        return this.assessmentsService.getCounts(user.companyId);
    }
    getById(id) {
        return this.assessmentsService.getAssessmentById(id);
    }
    getOwnAssessments(user) {
        return this.assessmentsService.getAssessmentsForUser(user.id);
    }
    getTeamAssessments(cycleId, user) {
        return this.assessmentsService.getTeamAssessments(user.id, cycleId);
    }
    getReviewSummary(revieweeId, cycleId) {
        return this.assessmentsService.getReviewSummary(revieweeId, cycleId);
    }
};
exports.AssessmentsController = AssessmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_assessment_dto_1.CreateAssessmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/start'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_self',
        'performance.reviews.submit_peer',
        'performance.reviews.submit_manager',
    ]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_self',
        'performance.reviews.submit_peer',
        'performance.reviews.submit_manager',
    ]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, submit_assessment_dto_1.SubmitAssessmentDto, Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_dashboard_assessments_dto_1.GetDashboardAssessmentsDto]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.read',
        'performance.reviews.read_team',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)('me/list'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getOwnAssessments", null);
__decorate([
    (0, common_1.Get)('team/:cycleId'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read_team']),
    __param(0, (0, common_1.Param)('cycleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getTeamAssessments", null);
__decorate([
    (0, common_1.Get)('summary/:revieweeId/:cycleId'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Param)('revieweeId')),
    __param(1, (0, common_1.Param)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AssessmentsController.prototype, "getReviewSummary", null);
exports.AssessmentsController = AssessmentsController = __decorate([
    (0, common_1.Controller)('performance-assessments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [assessments_service_1.AssessmentsService])
], AssessmentsController);
//# sourceMappingURL=assessments.controller.js.map