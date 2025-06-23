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
exports.CertificationsController = void 0;
const common_1 = require("@nestjs/common");
const certifications_service_1 = require("./certifications.service");
const create_certification_dto_1 = require("./dto/create-certification.dto");
const update_certification_dto_1 = require("./dto/update-certification.dto");
const audit_decorator_1 = require("../../../audit/audit.decorator");
const audit_interceptor_1 = require("../../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let CertificationsController = class CertificationsController extends base_controller_1.BaseController {
    constructor(certificationsService) {
        super();
        this.certificationsService = certificationsService;
    }
    create(employeeId, dto, user, ip) {
        return this.certificationsService.create(employeeId, dto, user.id, ip);
    }
    findAll(id) {
        return this.certificationsService.findAll(id);
    }
    findOne(id) {
        return this.certificationsService.findOne(id);
    }
    update(id, dto, user, ip) {
        return this.certificationsService.update(id, dto, user.id, ip);
    }
    remove(id) {
        return this.certificationsService.remove(id);
    }
};
exports.CertificationsController = CertificationsController;
__decorate([
    (0, common_1.Post)(':employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_certification_dto_1.CreateCertificationDto, Object, String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/all-certifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_certification_dto_1.UpdateCertificationDto, Object, String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'Employee Certification',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "remove", null);
exports.CertificationsController = CertificationsController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('employee-certifications'),
    __metadata("design:paramtypes", [certifications_service_1.CertificationsService])
], CertificationsController);
//# sourceMappingURL=certifications.controller.js.map