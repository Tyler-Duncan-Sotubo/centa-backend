import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PusherService } from './services/pusher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';

@Controller('')
export class NotificationController extends BaseController {
  constructor(private pusher: PusherService) {
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
}
