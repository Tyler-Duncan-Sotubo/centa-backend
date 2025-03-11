import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { PusherService } from './services/pusher.service';
import { ChatbotService } from './services/chatbot.service';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CacheModule } from 'src/config/cache/cache.module';

@Module({
  imports: [DrizzleModule, CacheModule],
  controllers: [NotificationController],
  providers: [PusherService, ChatbotService, JwtGuard],
})
export class NotificationModule {}
