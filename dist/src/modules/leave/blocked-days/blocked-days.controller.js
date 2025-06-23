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
exports.BlockedDaysController = void 0;
const common_1 = require("@nestjs/common");
const blocked_days_service_1 = require("./blocked-days.service");
const create_blocked_day_dto_1 = require("./dto/create-blocked-day.dto");
const update_blocked_day_dto_1 = require("./dto/update-blocked-day.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let BlockedDaysController = class BlockedDaysController extends base_controller_1.BaseController {
    constructor(blockedDaysService) {
        super();
        this.blockedDaysService = blockedDaysService;
    }
    create(createBlockedDayDto, user) {
        return this.blockedDaysService.create(createBlockedDayDto, user);
    }
    findAll(user) {
        return this.blockedDaysService.findAll(user.companyId);
    }
    findOne(id) {
        return this.blockedDaysService.findOne(id);
    }
    update(id, updateBlockedDayDto, user) {
        return this.blockedDaysService.update(id, updateBlockedDayDto, user);
    }
    remove(id) {
        return this.blockedDaysService.remove(id);
    }
};
exports.BlockedDaysController = BlockedDaysController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.blocked_days.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blocked_day_dto_1.CreateBlockedDayDto, Object]),
    __metadata("design:returntype", void 0)
], BlockedDaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.blocked_days.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlockedDaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.blocked_days.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BlockedDaysController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.blocked_days.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_blocked_day_dto_1.UpdateBlockedDayDto, Object]),
    __metadata("design:returntype", void 0)
], BlockedDaysController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.blocked_days.manage']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BlockedDaysController.prototype, "remove", null);
exports.BlockedDaysController = BlockedDaysController = __decorate([
    (0, common_1.Controller)('blocked-days'),
    __metadata("design:paramtypes", [blocked_days_service_1.BlockedDaysService])
], BlockedDaysController);
//# sourceMappingURL=blocked-days.controller.js.map