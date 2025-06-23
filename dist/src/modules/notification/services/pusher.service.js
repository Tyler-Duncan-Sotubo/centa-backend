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
exports.PusherService = void 0;
const common_1 = require("@nestjs/common");
const Pusher = require("pusher");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const notification_schema_1 = require("../schema/notification.schema");
let PusherService = class PusherService {
    constructor(config, db) {
        this.config = config;
        this.db = db;
        this.pusher = new Pusher({
            appId: this.config.get('PUSHER_APP_ID') || '',
            key: this.config.get('PUSHER_KEY') || '',
            secret: this.config.get('PUSHER_SECRET') || '',
            cluster: this.config.get('PUSHER_CLUSTER') || '',
            useTLS: true,
        });
    }
    async triggerEvent(channel, event, data) {
        await this.pusher.trigger(channel, event, data);
    }
    async createNotification(company_id, message, type) {
        const baseUrl = this.config.get('CLIENT_DASHBOARD_URL') || '/dashboard';
        const urlMap = {
            leave: `${baseUrl}/leave`,
            loan: `${baseUrl}/loans`,
            expense: `${baseUrl}/expenses`,
            asset: `${baseUrl}/assets/requests`,
        };
        const url = urlMap[type] ?? `${baseUrl}/notifications`;
        const result = await this.db
            .insert(notification_schema_1.notification)
            .values({
            message,
            type,
            company_id,
            url,
        })
            .returning({
            id: notification_schema_1.notification.id,
            message: notification_schema_1.notification.message,
            url: notification_schema_1.notification.url,
        })
            .execute();
        this.pusher.trigger(`company-${company_id}`, 'new-notification', result[0]);
        return result;
    }
    async createEmployeeNotification(companyId, employeeId, message, type) {
        const baseUrl = this.config.get('EMPLOYEE_DASHBOARD_URL') || '/dashboard';
        const urlMap = {
            leave: `${baseUrl}/leave`,
            loan: `${baseUrl}/loans`,
            expense: `${baseUrl}/reimbursements`,
            asset: `${baseUrl}/assets`,
        };
        const url = urlMap[type] ?? `${baseUrl}/notifications`;
        const [saved] = await this.db
            .insert(notification_schema_1.notification)
            .values({
            company_id: companyId,
            employee_id: employeeId,
            message,
            type,
            url,
        })
            .returning({
            id: notification_schema_1.notification.id,
            message: notification_schema_1.notification.message,
            url: notification_schema_1.notification.url,
        })
            .execute();
        await this.pusher.trigger(`employee-${employeeId}`, 'new-notification', saved);
        return saved;
    }
    async getUserNotifications(company_id) {
        return this.db
            .select()
            .from(notification_schema_1.notification)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notification_schema_1.notification.company_id, company_id), (0, drizzle_orm_1.eq)(notification_schema_1.notification.read, 'false')))
            .limit(5)
            .orderBy((0, drizzle_orm_1.desc)(notification_schema_1.notification.created_at));
    }
    async getEmployeeNotifications(company_id, employeeId) {
        return this.db
            .select()
            .from(notification_schema_1.notification)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notification_schema_1.notification.company_id, company_id), (0, drizzle_orm_1.eq)(notification_schema_1.notification.employee_id, employeeId), (0, drizzle_orm_1.eq)(notification_schema_1.notification.read, 'false')))
            .limit(5)
            .orderBy((0, drizzle_orm_1.desc)(notification_schema_1.notification.created_at));
    }
    async markAsRead(notificationId) {
        return this.db
            .update(notification_schema_1.notification)
            .set({ read: 'true' })
            .where((0, drizzle_orm_1.eq)(notification_schema_1.notification.id, notificationId));
    }
};
exports.PusherService = PusherService;
exports.PusherService = PusherService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], PusherService);
//# sourceMappingURL=pusher.service.js.map