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
exports.PipelineController = void 0;
const common_1 = require("@nestjs/common");
const pipeline_service_1 = require("./pipeline.service");
const create_pipeline_dto_1 = require("./dto/create-pipeline.dto");
const update_pipeline_dto_1 = require("./dto/update-pipeline.dto");
const pipeline_seeder_service_1 = require("./pipeline-seeder.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let PipelineController = class PipelineController extends base_controller_1.BaseController {
    constructor(pipelineService, pipelineSeedService) {
        super();
        this.pipelineService = pipelineService;
        this.pipelineSeedService = pipelineSeedService;
    }
    cloneTemplateForCompany(templateId, templateName, user) {
        return this.pipelineSeedService.cloneTemplateForCompany(templateId, user, templateName);
    }
    async createTemplate(createPipelineDto, user) {
        return this.pipelineService.createTemplate(user, createPipelineDto);
    }
    async findAllTemplates(user) {
        return this.pipelineService.findAllTemplates(user.companyId);
    }
    findOne(id) {
        return this.pipelineService.findTemplateWithStages(id);
    }
    update(id, updatePipelineDto, user) {
        return this.pipelineService.updateTemplate(id, user, updatePipelineDto);
    }
    remove(id, user) {
        return this.pipelineService.deleteTemplate(id, user);
    }
};
exports.PipelineController = PipelineController;
__decorate([
    (0, common_1.Post)('clone-seed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Body)('templateId')),
    __param(1, (0, common_1.Body)('templateName')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "cloneTemplateForCompany", null);
__decorate([
    (0, common_1.Post)('template'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pipeline_dto_1.CreatePipelineDto, Object]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "createTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "findAllTemplates", null);
__decorate([
    (0, common_1.Get)('template/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('template/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pipeline_dto_1.UpdatePipelineDto, Object]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('template/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PipelineController.prototype, "remove", null);
exports.PipelineController = PipelineController = __decorate([
    (0, common_1.Controller)('pipeline'),
    __metadata("design:paramtypes", [pipeline_service_1.PipelineService,
        pipeline_seeder_service_1.PipelineSeederService])
], PipelineController);
//# sourceMappingURL=pipeline.controller.js.map