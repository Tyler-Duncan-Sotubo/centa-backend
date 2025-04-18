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
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const base_controller_1 = require("../config/base.controller");
const chatbot_service_1 = require("./services/chatbot.service");
const push_notification_service_1 = require("./services/push-notification.service");
let NotificationController = class NotificationController extends base_controller_1.BaseController {
    constructor(pusher, chatbotService, pushNotificationService) {
        super();
        this.pusher = pusher;
        this.chatbotService = chatbotService;
        this.pushNotificationService = pushNotificationService;
    }
    async getUserNotifications(user) {
        return this.pusher.getUserNotifications(user.company_id);
    }
    async markAsRead(id) {
        return this.pusher.markAsRead(id);
    }
    async askAI(message, chatId) {
        return await this.chatbotService.chatWithAI(message, chatId);
    }
    async savePushToken(employee_id, token) {
        return this.pushNotificationService.saveToken(employee_id, token);
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
    (0, common_1.Put)('mark-as-read/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('chatbot/ask'),
    __param(0, (0, common_1.Body)('message')),
    __param(1, (0, common_1.Body)('chatId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "askAI", null);
__decorate([
    (0, common_1.Post)('push-token/:employee_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('employee_id')),
    __param(1, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "savePushToken", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [pusher_service_1.PusherService,
        chatbot_service_1.ChatbotService,
        push_notification_service_1.PushNotificationService])
], NotificationController);
//# sourceMappingURL=notifications.controller.js.map