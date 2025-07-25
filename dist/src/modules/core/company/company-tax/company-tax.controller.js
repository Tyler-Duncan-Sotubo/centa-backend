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
exports.CompanyTaxController = void 0;
const common_1 = require("@nestjs/common");
const company_tax_service_1 = require("./company-tax.service");
const create_company_tax_dto_1 = require("./dto/create-company-tax.dto");
const update_company_tax_dto_1 = require("./dto/update-company-tax.dto");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let CompanyTaxController = class CompanyTaxController extends base_controller_1.BaseController {
    constructor(companyTaxService) {
        super();
        this.companyTaxService = companyTaxService;
    }
    create(createCompanyTaxDto, user) {
        return this.companyTaxService.create(createCompanyTaxDto, user);
    }
    findOne(user) {
        return this.companyTaxService.findOne(user.companyId);
    }
    update(updateCompanyTaxDto, user) {
        return this.companyTaxService.update(updateCompanyTaxDto, user);
    }
};
exports.CompanyTaxController = CompanyTaxController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_tax_dto_1.CreateCompanyTaxDto, Object]),
    __metadata("design:returntype", void 0)
], CompanyTaxController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CompanyTaxController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_company_tax_dto_1.UpdateCompanyTaxDto, Object]),
    __metadata("design:returntype", void 0)
], CompanyTaxController.prototype, "update", null);
exports.CompanyTaxController = CompanyTaxController = __decorate([
    (0, common_1.Controller)('company-tax'),
    __metadata("design:paramtypes", [company_tax_service_1.CompanyTaxService])
], CompanyTaxController);
//# sourceMappingURL=company-tax.controller.js.map