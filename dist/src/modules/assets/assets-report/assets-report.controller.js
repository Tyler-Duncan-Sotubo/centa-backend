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
exports.AssetsReportController = void 0;
const common_1 = require("@nestjs/common");
const assets_report_service_1 = require("./assets-report.service");
const create_assets_report_dto_1 = require("./dto/create-assets-report.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let AssetsReportController = class AssetsReportController extends base_controller_1.BaseController {
    constructor(assetsReportService) {
        super();
        this.assetsReportService = assetsReportService;
    }
    create(createAssetsReportDto, user) {
        return this.assetsReportService.create(createAssetsReportDto, user);
    }
    findAll(user) {
        return this.assetsReportService.findAll(user.companyId);
    }
    findOne(id) {
        return this.assetsReportService.findOne(id);
    }
    update(id, user, status, assetStatus) {
        return this.assetsReportService.update(id, user, status, assetStatus);
    }
};
exports.AssetsReportController = AssetsReportController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.read']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_assets_report_dto_1.CreateAssetsReportDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsReportController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsReportController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssetsReportController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Body)('assetStatus')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], AssetsReportController.prototype, "update", null);
exports.AssetsReportController = AssetsReportController = __decorate([
    (0, common_1.Controller)('asset-reports'),
    __metadata("design:paramtypes", [assets_report_service_1.AssetsReportService])
], AssetsReportController);
//# sourceMappingURL=assets-report.controller.js.map