import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Module({
  imports: [DrizzleModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, JwtGuard],
})
export class AnalyticsModule {}
