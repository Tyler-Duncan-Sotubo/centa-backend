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
var PushNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
const expo_server_sdk_1 = require("expo-server-sdk");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const drizzle_orm_1 = require("drizzle-orm");
const expo_schema_1 = require("../../drizzle/schema/expo.schema");
let PushNotificationService = PushNotificationService_1 = class PushNotificationService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(PushNotificationService_1.name);
        this.expo = new expo_server_sdk_1.Expo();
    }
    async sendPushNotification(employee_id, title, body, data = {}) {
        const token = await this.db
            .select()
            .from(expo_schema_1.expo_tokens)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expo_tokens.employee_id, employee_id))
            .execute();
        if (token.length === 0) {
            return;
        }
        const expoPushToken = token[0].expoPushToken;
        if (!expo_server_sdk_1.Expo.isExpoPushToken(expoPushToken)) {
            this.logger.warn(`Invalid Expo push token: ${expoPushToken}`);
            return;
        }
        const messages = [
            {
                to: expoPushToken,
                sound: 'default',
                title,
                body,
                data,
            },
        ];
        const chunks = this.expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                this.logger.log(`✅ Push notification sent: ${JSON.stringify(ticketChunk)}`);
            }
            catch (error) {
                this.logger.log('❌ Error sending push notification', error);
            }
        }
    }
    async saveToken(employee_id, token) {
        const employee = await this.db
            .select()
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (employee.length === 0) {
            throw new common_1.BadRequestException('Employee not found');
        }
        if (!expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            throw new common_1.BadRequestException('Invalid Expo push token');
        }
        const existingToken = await this.db
            .select()
            .from(expo_schema_1.expo_tokens)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expo_tokens.employee_id, employee_id));
        if (existingToken.length > 0) {
            await this.db
                .update(expo_schema_1.expo_tokens)
                .set({ expoPushToken: token })
                .where((0, drizzle_orm_1.eq)(expo_schema_1.expo_tokens.employee_id, employee_id))
                .execute();
        }
        else {
            await this.db
                .insert(expo_schema_1.expo_tokens)
                .values({
                employee_id,
                expoPushToken: token,
            })
                .execute();
        }
        return { success: true, message: 'Token saved successfully' };
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = PushNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], PushNotificationService);
//# sourceMappingURL=push-notification.service.js.map