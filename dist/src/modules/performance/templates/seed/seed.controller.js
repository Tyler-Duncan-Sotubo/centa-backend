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
exports.SeedController = void 0;
const common_1 = require("@nestjs/common");
const questions_service_1 = require("./questions.service");
const competency_service_1 = require("./competency.service");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const create_competency_dto_1 = require("./dto/create-competency.dto");
const update_competency_dto_1 = require("./dto/update-competency.dto");
const create_questions_dto_1 = require("./dto/create-questions.dto");
const update_questions_dto_1 = require("./dto/update-questions.dto");
const role_competency_service_1 = require("./role-competency.service");
const create_role_expectation_dto_1 = require("./dto/create-role-expectation.dto");
const update_role_expectation_dto_1 = require("./dto/update-role-expectation.dto");
let SeedController = class SeedController extends base_controller_1.BaseController {
    constructor(performanceReviewQuestionService, performanceCompetencyService, roleCompetencyExpectationService) {
        super();
        this.performanceReviewQuestionService = performanceReviewQuestionService;
        this.performanceCompetencyService = performanceCompetencyService;
        this.roleCompetencyExpectationService = roleCompetencyExpectationService;
    }
    async createCompetency(user, dto) {
        return this.performanceCompetencyService.create(user.companyId, dto, user.id);
    }
    async getCompetencies(user) {
        return this.performanceCompetencyService.getCompetenciesWithQuestions(user.companyId);
    }
    async getOnlyCompetencies(user) {
        return this.performanceCompetencyService.getOnlyCompetencies(user.companyId);
    }
    async updateCompetency(user, id, dto) {
        return this.performanceCompetencyService.update(id, user, dto);
    }
    async deleteCompetency(user, id) {
        return this.performanceCompetencyService.delete(id, user);
    }
    seedLevels() {
        return this.performanceCompetencyService.seedSystemLevels();
    }
    async getLevels() {
        return this.performanceCompetencyService.getAllCompetencyLevels();
    }
    async create(dto, user) {
        return this.roleCompetencyExpectationService.create(user.companyId, dto, user);
    }
    async list(user) {
        return this.roleCompetencyExpectationService.list(user.companyId);
    }
    async getFramework(user) {
        return this.roleCompetencyExpectationService.getFrameworkSettings(user.companyId);
    }
    async getFrameworkFields(user) {
        return this.roleCompetencyExpectationService.getFrameworkFields(user.companyId);
    }
    async update(id, dto, user) {
        return this.roleCompetencyExpectationService.update(id, dto, user);
    }
    async delete(id, user) {
        return this.roleCompetencyExpectationService.delete(id, user);
    }
    async createQuestion(user, dto) {
        return this.performanceReviewQuestionService.create(user, dto);
    }
    async getQuestions(user) {
        return this.performanceReviewQuestionService.getAll(user.companyId);
    }
    async updateQuestion(user, id, dto) {
        return this.performanceReviewQuestionService.update(id, user, dto);
    }
    async deleteQuestion(user, id) {
        return this.performanceReviewQuestionService.delete(id, user);
    }
};
exports.SeedController = SeedController;
__decorate([
    (0, common_1.Post)('competency'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_competency_dto_1.CreateCompetencyDto]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "createCompetency", null);
__decorate([
    (0, common_1.Get)('competencies'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getCompetencies", null);
__decorate([
    (0, common_1.Get)('only-competencies'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getOnlyCompetencies", null);
__decorate([
    (0, common_1.Patch)('competency/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_competency_dto_1.UpdateCompetencyDto]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "updateCompetency", null);
__decorate([
    (0, common_1.Delete)('competency/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "deleteCompetency", null);
__decorate([
    (0, common_1.Post)('competency-levels'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SeedController.prototype, "seedLevels", null);
__decorate([
    (0, common_1.Get)('competency-levels'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getLevels", null);
__decorate([
    (0, common_1.Post)('role-expectations'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_role_expectation_dto_1.CreateRoleExpectationDto, Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('role-expectations'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('framework'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getFramework", null);
__decorate([
    (0, common_1.Get)('framework-fields'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getFrameworkFields", null);
__decorate([
    (0, common_1.Patch)('role-expectations/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_role_expectation_dto_1.UpdateRoleExpectationDto, Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('role-expectations/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('question'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_questions_dto_1.CreateQuestionsDto]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Get)('questions'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "getQuestions", null);
__decorate([
    (0, common_1.Patch)('question/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_questions_dto_1.UpdateQuestionsDto]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "updateQuestion", null);
__decorate([
    (0, common_1.Delete)('question/:id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeedController.prototype, "deleteQuestion", null);
exports.SeedController = SeedController = __decorate([
    (0, common_1.Controller)('performance-seed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [questions_service_1.PerformanceReviewQuestionService,
        competency_service_1.PerformanceCompetencyService,
        role_competency_service_1.RoleCompetencyExpectationService])
], SeedController);
//# sourceMappingURL=seed.controller.js.map