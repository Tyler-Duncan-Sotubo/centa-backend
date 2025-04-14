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
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const notifcation_schema_1 = require("../../drizzle/schema/notifcation.schema");
const drizzle_orm_1 = require("drizzle-orm");
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
        let url = `${baseUrl}/notifications`;
        switch (type) {
            case 'loan':
                url = `${baseUrl}/salary-advance`;
                break;
            case 'payroll':
                url = `${baseUrl}/payroll`;
                break;
            case 'leave':
                url = `${baseUrl}/time-attendance/leave/leave-history`;
                break;
            case 'expense':
                url = `${baseUrl}/expenses`;
                break;
        }
        const result = await this.db
            .insert(notifcation_schema_1.notification)
            .values({
            message,
            type,
            company_id,
            url,
        })
            .returning({
            id: notifcation_schema_1.notification.id,
            message: notifcation_schema_1.notification.message,
            url: notifcation_schema_1.notification.url,
        })
            .execute();
        this.pusher.trigger(`company-${company_id}`, 'new-notification', result[0]);
        return result;
    }
    async getUserNotifications(company_id) {
        return this.db
            .select()
            .from(notifcation_schema_1.notification)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(notifcation_schema_1.notification.company_id, company_id), (0, drizzle_orm_1.eq)(notifcation_schema_1.notification.read, 'false')))
            .limit(5)
            .orderBy((0, drizzle_orm_1.desc)(notifcation_schema_1.notification.created_at));
    }
    async markAsRead(notificationId) {
        return this.db
            .update(notifcation_schema_1.notification)
            .set({ read: 'true' })
            .where((0, drizzle_orm_1.eq)(notifcation_schema_1.notification.id, notificationId));
    }
};
exports.PusherService = PusherService;
exports.PusherService = PusherService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], PusherService);
//# sourceMappingURL=pusher.service.js.map