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
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const pusher_service_1 = require("./services/pusher.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../common/interceptor/base.controller");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
let NotificationController = class NotificationController extends base_controller_1.BaseController {
    constructor(pusher) {
        super();
        this.pusher = pusher;
    }
    async getUserNotifications(user) {
        return this.pusher.getUserNotifications(user.companyId);
    }
    async getEmployeeNotifications(user, employeeId) {
        return this.pusher.getEmployeeNotifications(user.companyId, employeeId);
    }
    async markAsRead(id) {
        return this.pusher.markAsRead(id);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)('my-notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('employee-notifications/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getEmployeeNotifications", null);
__decorate([
    (0, common_1.Put)('mark-as-read/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [pusher_service_1.PusherService])
], NotificationController);
//# sourceMappingURL=notifications.controller.js.map