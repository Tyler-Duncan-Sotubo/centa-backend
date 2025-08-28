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
const push_notification_service_1 = require("./services/push-notification.service");
const send_to_employee_dto_1 = require("./dto/send-to-employee.dto");
const register_device_dto_1 = require("./dto/register-device.dto");
let NotificationController = class NotificationController extends base_controller_1.BaseController {
    constructor(pusher, push) {
        super();
        this.pusher = pusher;
        this.push = push;
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
    async registerDevice(id, dto, user) {
        await this.push.saveToken(id, dto.expoPushToken, user.companyId, {
            platform: dto.platform,
            deviceId: dto.deviceId,
            appVersion: dto.appVersion,
        });
        return { status: 'ok' };
    }
    async unregisterDevice(token) {
        await this.push.deleteToken(token);
        return { status: 'ok' };
    }
    async sendToEmployee(employeeId, dto) {
        await this.push.createAndSendToEmployee(employeeId, dto);
        return { status: 'queued' };
    }
    async getUnreadCount(employeeId) {
        return this.push.getUnreadCount(employeeId);
    }
    async getNotificationsForEmployee(employeeId) {
        return this.push.getNotificationsForEmployee(employeeId);
    }
    async markRead(id) {
        return this.push.markRead(id);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)('my-notifications'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('employee-notifications/:employeeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getEmployeeNotifications", null);
__decorate([
    (0, common_1.Put)('mark-as-read/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('push-devices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, register_device_dto_1.RegisterDeviceDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Delete)('devices/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "unregisterDevice", null);
__decorate([
    (0, common_1.Post)('send-notifications/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_to_employee_dto_1.SendToEmployeeDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "sendToEmployee", null);
__decorate([
    (0, common_1.Get)('expo-notifications/unread-count/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('expo-notifications/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotificationsForEmployee", null);
__decorate([
    (0, common_1.Patch)('expo-notifications/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markRead", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pusher_service_1.PusherService,
        push_notification_service_1.PushNotificationService])
], NotificationController);
//# sourceMappingURL=notifications.controller.js.map