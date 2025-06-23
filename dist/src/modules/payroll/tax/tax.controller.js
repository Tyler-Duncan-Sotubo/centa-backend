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
exports.TaxController = void 0;
const common_1 = require("@nestjs/common");
const tax_service_1 = require("./tax.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const audit_decorator_1 = require("../../audit/audit.decorator");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let TaxController = class TaxController extends base_controller_1.BaseController {
    constructor(taxService) {
        super();
        this.taxService = taxService;
    }
    async downloadExcel(tax_filing_id, reply) {
        try {
            const buffer = await this.taxService.generateTaxFilingExcel(tax_filing_id);
            reply
                .header('Content-Disposition', `attachment; filename=tax_filing_${tax_filing_id}.xlsx`)
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return reply.send(buffer);
        }
        catch (error) {
            reply.status(500).send({
                message: 'Error generating Excel file',
                error: error.message,
            });
        }
    }
    async downloadVoluntary(type, month, reply) {
        try {
            const buffer = await this.taxService.generateVoluntaryDeductionsExcel(type, month);
            reply
                .header('Content-Disposition', `attachment; filename=tax_filing_${type}.xlsx`)
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return reply.send(buffer);
        }
        catch (error) {
            reply.status(500).send({
                message: 'Error generating Excel file',
                error: error.message,
            });
        }
    }
    async getCompanyTaxFilings(user) {
        return this.taxService.getCompanyTaxFilings(user.companyId);
    }
    async updateCompanyTaxFilings(id, status) {
        return this.taxService.updateCompanyTaxFilings(id, status);
    }
    async createCompanyTaxFiling(user) {
        return this.taxService.onPayrollApproval(user.companyId, '2025-05', 'fdc8a547-12ea-4baf-bc61-9601226d5f6a');
    }
};
exports.TaxController = TaxController;
__decorate([
    (0, common_1.Get)('tax-filings-download/:id'),
    (0, common_1.SetMetadata)('permission', ['tax.download']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TaxController.prototype, "downloadExcel", null);
__decorate([
    (0, common_1.Get)('voluntary-download'),
    (0, common_1.SetMetadata)('permission', ['tax.download']),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TaxController.prototype, "downloadVoluntary", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['tax.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaxController.prototype, "getCompanyTaxFilings", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['tax.manage']),
    (0, audit_decorator_1.Audit)({ action: 'Update Company Tax Filings', entity: 'Tax' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TaxController.prototype, "updateCompanyTaxFilings", null);
__decorate([
    (0, common_1.Post)('tax-filing'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['tax.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaxController.prototype, "createCompanyTaxFiling", null);
exports.TaxController = TaxController = __decorate([
    (0, common_1.Controller)('tax'),
    __metadata("design:paramtypes", [tax_service_1.TaxService])
], TaxController);
//# sourceMappingURL=tax.controller.js.map