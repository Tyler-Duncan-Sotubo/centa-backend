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
exports.GoogleController = void 0;
const common_1 = require("@nestjs/common");
const google_service_1 = require("./google.service");
const create_google_dto_1 = require("./dto/create-google.dto");
const update_google_dto_1 = require("./dto/update-google.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let GoogleController = class GoogleController extends base_controller_1.BaseController {
    constructor(googleService) {
        super();
        this.googleService = googleService;
    }
    create(createGoogleDto, user) {
        return this.googleService.create(createGoogleDto, user);
    }
    findOne(user) {
        return this.googleService.findOne(user.companyId);
    }
    update(updateGoogleDto, user) {
        return this.googleService.update(user.companyId, updateGoogleDto);
    }
};
exports.GoogleController = GoogleController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_google_dto_1.CreateGoogleDto, Object]),
    __metadata("design:returntype", void 0)
], GoogleController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GoogleController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_google_dto_1.UpdateGoogleDto, Object]),
    __metadata("design:returntype", void 0)
], GoogleController.prototype, "update", null);
exports.GoogleController = GoogleController = __decorate([
    (0, common_1.Controller)('google'),
    __metadata("design:paramtypes", [google_service_1.GoogleService])
], GoogleController);
//# sourceMappingURL=google.controller.js.map