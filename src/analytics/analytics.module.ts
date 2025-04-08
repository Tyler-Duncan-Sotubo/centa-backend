import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [DrizzleModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrimaryGuard, JwtService],
})
export class AnalyticsModule {}
