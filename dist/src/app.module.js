"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const logger_1 = require("./config/logger");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("./drizzle/drizzle.module");
const auth_module_1 = require("./auth/auth.module");
const organization_module_1 = require("./organization/organization.module");
const payroll_module_1 = require("./payroll/payroll.module");
const Joi = require("joi");
const notification_module_1 = require("./notification/notification.module");
const analytics_module_1 = require("./analytics/analytics.module");
const bullmq_1 = require("@nestjs/bullmq");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            drizzle_module_1.DrizzleModule,
            logger_1.LoggerModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: Joi.object({
                    JWT_EXPIRATION: Joi.string().required(),
                    JWT_REFRESH_EXPIRATION: Joi.string().required(),
                    JWT_SECRET: Joi.string().required(),
                    SEND_GRID_KEY: Joi.string().required(),
                    PASSWORD_RESET_TEMPLATE_ID: Joi.string().required(),
                    VERIFY_TEMPLATE_ID: Joi.string().required(),
                    FEEDBACK_TEMPLATE_ID: Joi.string().required(),
                    INVITE_TEMPLATE_ID: Joi.string().required(),
                    DATABASE_URL: Joi.string().required(),
                    CLIENT_URL: Joi.string().required(),
                    CLIENT_DASHBOARD_URL: Joi.string().required(),
                    AWS_ACCESS_KEY_ID: Joi.string().required(),
                    AWS_SECRET_ACCESS_KEY: Joi.string().required(),
                    AWS_REGION: Joi.string().required(),
                    AWS_BUCKET_NAME: Joi.string().required(),
                    PAYSTACK_SECRET_KEY: Joi.string().required(),
                    PUSHER_APP_ID: Joi.string().required(),
                    PUSHER_KEY: Joi.string().required(),
                    PUSHER_SECRET: Joi.string().required(),
                    PUSHER_CLUSTER: Joi.string().required(),
                    PUSHER_ENCRYPTED: Joi.string().required(),
                }),
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    connection: {
                        host: configService.get('REDIS_HOST'),
                        port: configService.get('REDIS_PORT'),
                        password: configService.get('REDIS_PASSWORD'),
                    },
                    isGlobal: true,
                }),
            }),
            auth_module_1.AuthModule,
            organization_module_1.OrganizationModule,
            payroll_module_1.PayrollModule,
            notification_module_1.NotificationModule,
            analytics_module_1.AnalyticsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map