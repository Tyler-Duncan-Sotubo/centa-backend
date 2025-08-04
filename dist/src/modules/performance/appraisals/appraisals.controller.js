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
exports.AppraisalsController = void 0;
const common_1 = require("@nestjs/common");
const create_appraisal_cycle_dto_1 = require("./dto/create-appraisal-cycle.dto");
const update_appraisal_cycle_dto_1 = require("./dto/update-appraisal-cycle.dto");
const appraisal_cycle_service_1 = require("./appraisal-cycle.service");
const appraisals_service_1 = require("./appraisals.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_appraisal_dto_1 = require("./dto/create-appraisal.dto");
const update_appraisal_dto_1 = require("./dto/update-appraisal.dto");
const appraisal_entries_service_1 = require("./appraisal-entries.service");
let AppraisalsController = class AppraisalsController extends base_controller_1.BaseController {
    constructor(appraisalsCycleService, appraisalsService, appraisalEntriesService) {
        super();
        this.appraisalsCycleService = appraisalsCycleService;
        this.appraisalsService = appraisalsService;
        this.appraisalEntriesService = appraisalEntriesService;
    }
    create(dto, user) {
        return this.appraisalsCycleService.create(dto, user.companyId, user.id);
    }
    findAll(user) {
        return this.appraisalsCycleService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.appraisalsCycleService.findOne(id, user.companyId);
    }
    findCurrent(user) {
        return this.appraisalsCycleService.findCurrent(user.companyId);
    }
    update(id, updateDto, user) {
        return this.appraisalsCycleService.update(id, updateDto, user);
    }
    remove(id, user) {
        return this.appraisalsCycleService.remove(id, user);
    }
    createAppraisal(createDto, user) {
        return this.appraisalsService.create(createDto, user.companyId, user.id);
    }
    findAllAppraisals(cycleId, user) {
        return this.appraisalsService.findAll(user.companyId, cycleId);
    }
    async updateManager(appraisalId, body, user) {
        return this.appraisalsService.updateManager(appraisalId, body.managerId, user);
    }
    findOneAppraisal(id, user) {
        return this.appraisalsService.findOne(id, user.companyId);
    }
    updateAppraisal(id, updateDto, user) {
        return this.appraisalsService.update(id, updateDto, user);
    }
    removeAppraisal(id, user) {
        return this.appraisalsService.remove(id, user);
    }
    async getEntries(appraisalId) {
        return this.appraisalEntriesService.getAppraisalEntriesWithExpectations(appraisalId);
    }
    async upsertEntries(appraisalId, entries, user) {
        return this.appraisalEntriesService.upsertEntries(appraisalId, entries, user);
    }
    async restartAppraisal(appraisalId, user) {
        return this.appraisalsService.restartAppraisal(appraisalId, user);
    }
};
exports.AppraisalsController = AppraisalsController;
__decorate([
    (0, common_1.Post)('cycle'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appraisal_cycle_dto_1.CreateAppraisalCycleDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('cycle'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('cycle/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('cycle/current'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "findCurrent", null);
__decorate([
    (0, common_1.Patch)('cycle/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_appraisal_cycle_dto_1.UpdateAppraisalCycleDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('cycle/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appraisal_dto_1.CreateAppraisalDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "createAppraisal", null);
__decorate([
    (0, common_1.Get)(':cycleId/appraisals'),
    __param(0, (0, common_1.Param)('cycleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "findAllAppraisals", null);
__decorate([
    (0, common_1.Patch)(':id/manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AppraisalsController.prototype, "updateManager", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "findOneAppraisal", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_appraisal_dto_1.UpdateAppraisalDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "updateAppraisal", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalsController.prototype, "removeAppraisal", null);
__decorate([
    (0, common_1.Get)(':id/entries'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppraisalsController.prototype, "getEntries", null);
__decorate([
    (0, common_1.Post)(':id/entries'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], AppraisalsController.prototype, "upsertEntries", null);
__decorate([
    (0, common_1.Delete)(':id/restart'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppraisalsController.prototype, "restartAppraisal", null);
exports.AppraisalsController = AppraisalsController = __decorate([
    (0, common_1.Controller)('appraisals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['performance.cycles.manage']),
    __metadata("design:paramtypes", [appraisal_cycle_service_1.AppraisalCycleService,
        appraisals_service_1.AppraisalsService,
        appraisal_entries_service_1.AppraisalEntriesService])
], AppraisalsController);
//# sourceMappingURL=appraisals.controller.js.map