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
exports.OnboardingSeederController = void 0;
const common_1 = require("@nestjs/common");
const seeder_service_1 = require("./seeder.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_onboarding_template_dto_1 = require("./dto/create-onboarding-template.dto");
let OnboardingSeederController = class OnboardingSeederController extends base_controller_1.BaseController {
    constructor(seeder) {
        super();
        this.seeder = seeder;
    }
    getGlobalTemplates(templateId) {
        return this.seeder.getTemplateByIdWithDetails(templateId);
    }
    cloneTemplateForCompany(templateId, templateName, user) {
        return this.seeder.cloneTemplateForCompany(templateId, user.companyId, templateName);
    }
    createCompanyTemplate(dto, user) {
        return this.seeder.createCompanyTemplate(user.companyId, dto);
    }
    getCompanyTemplates(user) {
        return this.seeder.getTemplatesByCompany(user.companyId);
    }
    getTemplatesByCompanyWithDetails(user) {
        return this.seeder.getTemplatesByCompanyWithDetails(user.companyId);
    }
    updateTemplate(templateId, dto) {
        return this.seeder.updateTemplateById(templateId, dto);
    }
};
exports.OnboardingSeederController = OnboardingSeederController;
__decorate([
    (0, common_1.Get)('single-template/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "getGlobalTemplates", null);
__decorate([
    (0, common_1.Post)('clone-seed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Body)('templateId')),
    __param(1, (0, common_1.Body)('templateName')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "cloneTemplateForCompany", null);
__decorate([
    (0, common_1.Post)('create-company-template'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_onboarding_template_dto_1.CreateOnboardingTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "createCompanyTemplate", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "getCompanyTemplates", null);
__decorate([
    (0, common_1.Get)('templates-all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "getTemplatesByCompanyWithDetails", null);
__decorate([
    (0, common_1.Patch)('update-template/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Param)('templateId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_onboarding_template_dto_1.CreateOnboardingTemplateDto]),
    __metadata("design:returntype", void 0)
], OnboardingSeederController.prototype, "updateTemplate", null);
exports.OnboardingSeederController = OnboardingSeederController = __decorate([
    (0, common_1.Controller)('onboarding-seeder'),
    __metadata("design:paramtypes", [seeder_service_1.OnboardingSeederService])
], OnboardingSeederController);
//# sourceMappingURL=seeder.controller.js.map