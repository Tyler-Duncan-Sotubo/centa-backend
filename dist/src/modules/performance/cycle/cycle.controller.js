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
exports.CycleController = void 0;
const common_1 = require("@nestjs/common");
const cycle_service_1 = require("./cycle.service");
const create_cycle_dto_1 = require("./dto/create-cycle.dto");
const update_cycle_dto_1 = require("./dto/update-cycle.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let CycleController = class CycleController extends base_controller_1.BaseController {
    constructor(cycleService) {
        super();
        this.cycleService = cycleService;
    }
    create(createCycleDto, user) {
        return this.cycleService.create(createCycleDto, user.companyId, user.id);
    }
    findAll(user) {
        return this.cycleService.findAll(user.companyId);
    }
    findCurrent(user) {
        return this.cycleService.findCurrent(user.companyId);
    }
    findOne(id) {
        return this.cycleService.findOne(id);
    }
    update(id, updateCycleDto, user) {
        return this.cycleService.update(id, updateCycleDto, user);
    }
    remove(id, user) {
        return this.cycleService.remove(id, user);
    }
};
exports.CycleController = CycleController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cycle_dto_1.CreateCycleDto, Object]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "findCurrent", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cycle_dto_1.UpdateCycleDto, Object]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CycleController.prototype, "remove", null);
exports.CycleController = CycleController = __decorate([
    (0, common_1.Controller)('performance-cycle'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [cycle_service_1.CycleService])
], CycleController);
//# sourceMappingURL=cycle.controller.js.map