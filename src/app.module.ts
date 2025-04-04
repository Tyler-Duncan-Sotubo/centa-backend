import { Module } from '@nestjs/common';
import { LoggerModule } from './config/logger';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from './drizzle/drizzle.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { PayrollModule } from './payroll/payroll.module';
import * as Joi from 'joi';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    DrizzleModule,
    LoggerModule,
    ConfigModule.forRoot({
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
        isGlobal: true,
      }),
    }),

    AuthModule,
    OrganizationModule,
    PayrollModule,
    NotificationModule,
    AnalyticsModule,
    AuditModule,
  ],
})
export class AppModule {}
