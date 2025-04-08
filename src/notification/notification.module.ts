import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { PusherService } from './services/pusher.service';
import { ChatbotService } from './services/chatbot.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { CacheModule } from 'src/config/cache/cache.module';
import { BullModule } from '@nestjs/bullmq';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    DrizzleModule,
    CacheModule,
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [NotificationController],
  providers: [PusherService, ChatbotService, PrimaryGuard, JwtService],
})
export class NotificationModule {}
