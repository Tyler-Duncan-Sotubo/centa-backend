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
exports.OfferLetterController = void 0;
const common_1 = require("@nestjs/common");
const offer_letter_service_1 = require("./offer-letter.service");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const create_offer_template_dto_1 = require("./dto/create-offer-template.dto");
const update_offer_template_dto_1 = require("./dto/update-offer-template.dto");
let OfferLetterController = class OfferLetterController extends base_controller_1.BaseController {
    constructor(offerLetterService) {
        super();
        this.offerLetterService = offerLetterService;
    }
    async cloneCompanyTemplate(user, templateId) {
        return this.offerLetterService.cloneCompanyTemplate(user, templateId);
    }
    async createOfferLetterTemplate(user, createOfferTemplateDto) {
        return this.offerLetterService.createCompanyTemplate(user, createOfferTemplateDto);
    }
    async getCompanyOfferLetterTemplates(user) {
        return this.offerLetterService.getCompanyTemplates(user.companyId);
    }
    async getOfferLetterTemplate(user, templateId) {
        return this.offerLetterService.getTemplateById(templateId, user.companyId);
    }
    async updateOfferLetterTemplate(user, templateId, updateOfferTemplateDto) {
        return this.offerLetterService.updateTemplate(templateId, user, updateOfferTemplateDto);
    }
    async deleteOfferLetterTemplate(user, templateId) {
        return this.offerLetterService.deleteTemplate(templateId, user);
    }
};
exports.OfferLetterController = OfferLetterController;
__decorate([
    (0, common_1.Post)('clone-company-template'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "cloneCompanyTemplate", null);
__decorate([
    (0, common_1.Post)('create-template'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_offer_template_dto_1.CreateOfferTemplateDto]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "createOfferLetterTemplate", null);
__decorate([
    (0, common_1.Get)('company-templates'),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "getCompanyOfferLetterTemplates", null);
__decorate([
    (0, common_1.Get)('template/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "getOfferLetterTemplate", null);
__decorate([
    (0, common_1.Patch)('template/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('templateId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_offer_template_dto_1.UpdateOfferTemplateDto]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "updateOfferLetterTemplate", null);
__decorate([
    (0, common_1.Delete)('template/:templateId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OfferLetterController.prototype, "deleteOfferLetterTemplate", null);
exports.OfferLetterController = OfferLetterController = __decorate([
    (0, common_1.Controller)('offer-letter'),
    __metadata("design:paramtypes", [offer_letter_service_1.OfferLetterService])
], OfferLetterController);
//# sourceMappingURL=offer-letter.controller.js.map