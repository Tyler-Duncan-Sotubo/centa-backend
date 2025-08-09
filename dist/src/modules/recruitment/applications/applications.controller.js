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
exports.ApplicationsController = void 0;
const common_1 = require("@nestjs/common");
const applications_service_1 = require("./applications.service");
const create_application_dto_1 = require("./dto/create-application.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const move_to_stage_dto_1 = require("./dto/move-to-stage.dto");
const chnage_app_status_dto_1 = require("./dto/chnage-app-status.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let ApplicationsController = class ApplicationsController extends base_controller_1.BaseController {
    constructor(applicationsService) {
        super();
        this.applicationsService = applicationsService;
    }
    submitApplication(createApplicationDto, user) {
        return this.applicationsService.submitApplication(createApplicationDto, user);
    }
    listApplicationsByJobKanban(jobId) {
        return this.applicationsService.listApplicationsByJobKanban(jobId);
    }
    findOne(applicationId) {
        return this.applicationsService.getApplicationDetails(applicationId);
    }
    moveToStage(dto, user) {
        return this.applicationsService.moveToStage(dto, user);
    }
    changeStatus(dto, user) {
        return this.applicationsService.changeStatus(dto, user);
    }
};
exports.ApplicationsController = ApplicationsController;
__decorate([
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_application_dto_1.CreateApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "submitApplication", null);
__decorate([
    (0, common_1.Get)('list/:jobId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['applications.read']),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "listApplicationsByJobKanban", null);
__decorate([
    (0, common_1.Get)(':applicationId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['applications.read']),
    __param(0, (0, common_1.Param)('applicationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('move-stage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['applications.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [move_to_stage_dto_1.MoveToStageDto, Object]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "moveToStage", null);
__decorate([
    (0, common_1.Patch)('change-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['applications.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chnage_app_status_dto_1.ChangeApplicationStatusDto, Object]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "changeStatus", null);
exports.ApplicationsController = ApplicationsController = __decorate([
    (0, common_1.Controller)('applications'),
    __metadata("design:paramtypes", [applications_service_1.ApplicationsService])
], ApplicationsController);
//# sourceMappingURL=applications.controller.js.map