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
exports.PerformanceTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const templates_service_1 = require("./templates.service");
const create_template_dto_1 = require("./dto/create-template.dto");
const update_template_dto_1 = require("./dto/update-template.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PerformanceTemplatesController = class PerformanceTemplatesController extends base_controller_1.BaseController {
    constructor(templatesService) {
        super();
        this.templatesService = templatesService;
    }
    create(createTemplateDto, user) {
        return this.templatesService.create(user, createTemplateDto);
    }
    findAll(user) {
        return this.templatesService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.templatesService.findOne(id, user.companyId);
    }
    update(templateId, updateTemplateDto, user) {
        return this.templatesService.update(templateId, updateTemplateDto, user);
    }
    remove(templateId, user) {
        return this.templatesService.remove(templateId, user);
    }
    assignQuestions(templateId, questionIds, user) {
        return this.templatesService.assignQuestions(templateId, questionIds, user);
    }
    removeQuestion(templateId, questionId, user) {
        return this.templatesService.removeQuestion(templateId, questionId, user);
    }
};
exports.PerformanceTemplatesController = PerformanceTemplatesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_template_dto_1.CreateTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':templateId'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_template_dto_1.UpdateTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':templateId'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':templateId/questions'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, common_1.Body)('questionIds')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "assignQuestions", null);
__decorate([
    (0, common_1.Delete)(':templateId/questions/:questionId'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, common_1.Param)('questionId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PerformanceTemplatesController.prototype, "removeQuestion", null);
exports.PerformanceTemplatesController = PerformanceTemplatesController = __decorate([
    (0, common_1.Controller)('templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [templates_service_1.PerformanceTemplatesService])
], PerformanceTemplatesController);
//# sourceMappingURL=templates.controller.js.map