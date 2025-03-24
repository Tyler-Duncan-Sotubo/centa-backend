import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { PusherService } from './services/pusher.service';
import { ChatbotService } from './services/chatbot.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CacheModule } from 'src/config/cache/cache.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    DrizzleModule,
    CacheModule,
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [NotificationController],
  providers: [PusherService, ChatbotService, JwtGuard],
})
export class NotificationModule {}
