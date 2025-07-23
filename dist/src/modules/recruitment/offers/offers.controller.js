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
exports.OffersController = void 0;
const common_1 = require("@nestjs/common");
const offers_service_1 = require("./offers.service");
const create_offer_dto_1 = require("./dto/create-offer.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const get_offer_template_variables_dto_1 = require("./dto/get-offer-template-variables.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const update_offer_dto_1 = require("./dto/update-offer.dto");
const send_offer_service_1 = require("./send-offer.service");
const signed_offer_dto_1 = require("./dto/signed-offer.dto");
let OffersController = class OffersController extends base_controller_1.BaseController {
    constructor(offersService, sendOffersService) {
        super();
        this.offersService = offersService;
        this.sendOffersService = sendOffersService;
    }
    create(createOfferDto, user) {
        return this.offersService.create(createOfferDto, user);
    }
    getTemplateVariables(dto, user) {
        return this.offersService.getTemplateVariablesWithAutoFilledData(dto.templateId, dto.applicationId, user);
    }
    getTemplateVariablesFromOffer(id) {
        return this.offersService.getTemplateVariablesFromOffer(id);
    }
    findAll(user) {
        return this.offersService.findAll(user.companyId);
    }
    findOne(id) {
        return this.offersService.findOne(+id);
    }
    update(id, updateOfferDto, user) {
        return this.offersService.update(id, updateOfferDto, user);
    }
    async sendOffer(offerId, email, user) {
        return this.sendOffersService.sendOffer(offerId, email, user);
    }
    async signOffer(dto) {
        return this.offersService.signOffer(dto);
    }
    async verifyOffer(token) {
        return this.sendOffersService.getOfferFromToken(token);
    }
};
exports.OffersController = OffersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_offer_dto_1.CreateOfferDto, Object]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('variables'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_offer_template_variables_dto_1.GetOfferTemplateVariablesDto, Object]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "getTemplateVariables", null);
__decorate([
    (0, common_1.Get)('variables/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "getTemplateVariablesFromOffer", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_offer_dto_1.UpdateOfferDto, Object]),
    __metadata("design:returntype", void 0)
], OffersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':offerId/send'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['offers.manage']),
    __param(0, (0, common_1.Param)('offerId')),
    __param(1, (0, common_1.Body)('email')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OffersController.prototype, "sendOffer", null);
__decorate([
    (0, common_1.Post)('signed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signed_offer_dto_1.SignOfferDto]),
    __metadata("design:returntype", Promise)
], OffersController.prototype, "signOffer", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OffersController.prototype, "verifyOffer", null);
exports.OffersController = OffersController = __decorate([
    (0, common_1.Controller)('offers'),
    __metadata("design:paramtypes", [offers_service_1.OffersService,
        send_offer_service_1.SendOffersService])
], OffersController);
//# sourceMappingURL=offers.controller.js.map