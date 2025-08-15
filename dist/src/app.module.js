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
const logger_1 = require("./common/logger");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("./drizzle/drizzle.module");
const Joi = require("joi");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const modules_module_1 = require("./modules/modules.module");
const company_settings_module_1 = require("./company-settings/company-settings.module");
const holidays_module_1 = require("./modules/leave/holidays/holidays.module");
const cache_module_1 = require("./common/cache/cache.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            modules_module_1.ModulesModule,
            schedule_1.ScheduleModule.forRoot(),
            drizzle_module_1.DrizzleModule,
            logger_1.LoggerModule,
            cache_module_1.CacheModule,
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
                        family: 0,
                    },
                    isGlobal: true,
                }),
            }),
            company_settings_module_1.CompanySettingsModule,
            holidays_module_1.HolidaysModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map