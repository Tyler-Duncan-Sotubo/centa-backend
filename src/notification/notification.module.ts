import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { PusherService } from './services/pusher.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Module({
  imports: [DrizzleModule],
  controllers: [NotificationController],
  providers: [PusherService, JwtGuard],
})
export class NotificationModule {}
