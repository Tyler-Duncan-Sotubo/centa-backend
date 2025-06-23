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
exports.OrgChartController = void 0;
const common_1 = require("@nestjs/common");
const org_chart_service_1 = require("./org-chart.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
let OrgChartController = class OrgChartController extends base_controller_1.BaseController {
    constructor(orgChartService) {
        super();
        this.orgChartService = orgChartService;
    }
    async getOrgChart(user) {
        return this.orgChartService.buildOrgChart(user.companyId);
    }
};
exports.OrgChartController = OrgChartController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrgChartController.prototype, "getOrgChart", null);
exports.OrgChartController = OrgChartController = __decorate([
    (0, common_1.Controller)('org-chart'),
    __metadata("design:paramtypes", [org_chart_service_1.OrgChartService])
], OrgChartController);
//# sourceMappingURL=org-chart.controller.js.map