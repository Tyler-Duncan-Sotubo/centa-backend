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
exports.AssetsRequestController = void 0;
const common_1 = require("@nestjs/common");
const assets_request_service_1 = require("./assets-request.service");
const create_assets_request_dto_1 = require("./dto/create-assets-request.dto");
const update_assets_request_dto_1 = require("./dto/update-assets-request.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let AssetsRequestController = class AssetsRequestController extends base_controller_1.BaseController {
    constructor(assetsRequestService) {
        super();
        this.assetsRequestService = assetsRequestService;
    }
    create(createAssetsRequestDto, user) {
        return this.assetsRequestService.create(createAssetsRequestDto, user);
    }
    findAll(user) {
        return this.assetsRequestService.findAll(user.companyId);
    }
    findOne(id) {
        return this.assetsRequestService.findOne(id);
    }
    findByEmployeeId(id) {
        return this.assetsRequestService.findByEmployeeId(id);
    }
    getApprovalStatus(id) {
        return this.assetsRequestService.checkApprovalStatus(id);
    }
    approveExpense(id, action, remarks, user) {
        return this.assetsRequestService.handleAssetApprovalAction(id, user, action, remarks);
    }
    update(id, updateAssetsRequestDto, user) {
        return this.assetsRequestService.update(id, updateAssetsRequestDto, user);
    }
};
exports.AssetsRequestController = AssetsRequestController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_assets_request_dto_1.CreateAssetsRequestDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('employee/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "findByEmployeeId", null);
__decorate([
    (0, common_1.Get)(':id/approval-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "getApprovalStatus", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('action')),
    __param(2, (0, common_1.Body)('remarks')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "approveExpense", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['assets.request.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_assets_request_dto_1.UpdateAssetsRequestDto, Object]),
    __metadata("design:returntype", void 0)
], AssetsRequestController.prototype, "update", null);
exports.AssetsRequestController = AssetsRequestController = __decorate([
    (0, common_1.Controller)('asset-requests'),
    __metadata("design:paramtypes", [assets_request_service_1.AssetsRequestService])
], AssetsRequestController);
//# sourceMappingURL=assets-request.controller.js.map