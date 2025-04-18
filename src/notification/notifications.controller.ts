import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PusherService } from './services/pusher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';
import { ChatbotService } from './services/chatbot.service';
import { PushNotificationService } from './services/push-notification.service';

@Controller('')
export class NotificationController extends BaseController {
  constructor(
    private pusher: PusherService,
    private readonly chatbotService: ChatbotService,
    private readonly pushNotificationService: PushNotificationService,
  ) {
    super();
  }

  @Get('my-notifications')
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(@CurrentUser() user: User) {
    return this.pusher.getUserNotifications(user.company_id);
  }

  @Put('mark-as-read/:id')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string) {
    return this.pusher.markAsRead(id);
  }

  @Post('chatbot/ask')
  async askAI(
    @Body('message') message: string,
    @Body('chatId') chatId: string,
  ) {
    return await this.chatbotService.chatWithAI(message, chatId);
  }

  @Post('push-token/:employee_id')
  @UseGuards(JwtAuthGuard)
  async savePushToken(
    @Param('employee_id') employee_id: string,
    @Body('token') token: string,
  ) {
    return this.pushNotificationService.saveToken(employee_id, token);
  }
}
