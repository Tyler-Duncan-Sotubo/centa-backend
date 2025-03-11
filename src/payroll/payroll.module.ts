import { Module } from '@nestjs/common';
import { PayrollService } from './services/payroll.service';
import { PayrollController } from './payroll.controller';
import { LoanController } from './loan.controller';
import { BullModule } from '@nestjs/bullmq';
import { PayrollProcessor } from './payroll.processor';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PayslipService } from './services/payslip.service';
import { DeductionService } from './services/deduction.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CacheModule } from 'src/config/cache/cache.module';
import { CacheService } from 'src/config/cache/cache.service';
import { AwsService } from 'src/config/aws/aws.service';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';
import { LoanService } from './services/loan.service';
import { PusherService } from 'src/notification/services/pusher.service';
import * as redisStore from 'cache-manager-redis-store';
import { OnboardingService } from 'src/organization/services/onboarding.service';
@Module({
  imports: [
    CacheModule,
    DrizzleModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
        store: redisStore,
        ttl: configService.get<number>('CACHE_TTL'),
        isGlobal: true,
      }),
    }),
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
  ],
  controllers: [PayrollController, LoanController],
  providers: [
    PayrollService,
    PayrollProcessor,
    PayslipService,
    DeductionService,
    JwtGuard,
    CacheService,
    AwsService,
    TaxService,
    PdfService,
    LoanService,
    PusherService,
    OnboardingService,
  ],
})
export class PayrollModule {}
