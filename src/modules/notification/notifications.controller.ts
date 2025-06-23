import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PusherService } from './services/pusher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

@Controller('')
export class NotificationController extends BaseController {
  constructor(private pusher: PusherService) {
    super();
  }

  @Get('my-notifications')
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(@CurrentUser() user: User) {
    return this.pusher.getUserNotifications(user.companyId);
  }

  @Get('employee-notifications/:employeeId')
  @UseGuards(JwtAuthGuard)
  async getEmployeeNotifications(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.pusher.getEmployeeNotifications(user.companyId, employeeId);
  }

  @Put('mark-as-read/:id')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string) {
    return this.pusher.markAsRead(id);
  }
}
