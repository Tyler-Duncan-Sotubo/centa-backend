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
exports.CostCentersController = void 0;
const common_1 = require("@nestjs/common");
const cost_centers_service_1 = require("./cost-centers.service");
const create_cost_center_dto_1 = require("./dto/create-cost-center.dto");
const update_cost_center_dto_1 = require("./dto/update-cost-center.dto");
const audit_decorator_1 = require("../../audit/audit.decorator");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let CostCentersController = class CostCentersController extends base_controller_1.BaseController {
    constructor(costCentersService) {
        super();
        this.costCentersService = costCentersService;
    }
    create(createCostCenterDto, user) {
        return this.costCentersService.create(user.companyId, createCostCenterDto);
    }
    async bulkCreate(rows, user) {
        return this.costCentersService.bulkCreate(user.companyId, rows);
    }
    findAll(user) {
        return this.costCentersService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.costCentersService.findOne(user.companyId, id);
    }
    update(id, updateCostCenterDto, user, ip) {
        return this.costCentersService.update(user.companyId, id, updateCostCenterDto, user.id, ip);
    }
    remove(id, user) {
        return this.costCentersService.remove(user, id);
    }
};
exports.CostCentersController = CostCentersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Create',
        entity: 'Cost Center',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cost_center_dto_1.CreateCostCenterDto, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.manage']),
    (0, audit_decorator_1.Audit)({ action: 'BulkCreateCostCenters', entity: 'CostCenter' }),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], CostCentersController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cost_center_dto_1.UpdateCostCenterDto, Object, String]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['cost_center.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CostCentersController.prototype, "remove", null);
exports.CostCentersController = CostCentersController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('cost-centers'),
    __metadata("design:paramtypes", [cost_centers_service_1.CostCentersService])
], CostCentersController);
//# sourceMappingURL=cost-centers.controller.js.map