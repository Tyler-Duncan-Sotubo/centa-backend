import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PusherService } from './services/pusher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { PushNotificationService } from './services/push-notification.service';
import { SendToEmployeeDto } from './dto/send-to-employee.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('')
@UseGuards(JwtAuthGuard)
export class NotificationController extends BaseController {
  constructor(
    private pusher: PusherService,
    private push: PushNotificationService,
  ) {
    super();
  }

  @Get('my-notifications')
  async getUserNotifications(@CurrentUser() user: User) {
    return this.pusher.getUserNotifications(user.companyId);
  }

  @Get('employee-notifications/:employeeId')
  async getEmployeeNotifications(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.pusher.getEmployeeNotifications(user.companyId, employeeId);
  }

  @Put('mark-as-read/:id')
  async markAsRead(@Param('id') id: string) {
    return this.pusher.markAsRead(id);
  }

  @Post('push-devices/:id')
  async registerDevice(
    @Param('id') id: string,
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: User,
  ) {
    await this.push.saveToken(id, dto.expoPushToken, user.companyId, {
      platform: dto.platform,
      deviceId: dto.deviceId,
      appVersion: dto.appVersion,
    });
    return { status: 'ok' };
  }

  @Delete('devices/:token')
  async unregisterDevice(@Param('token') token: string) {
    await this.push.deleteToken(token);
    return { status: 'ok' };
  }

  @Post('send-notifications/:employeeId')
  async sendToEmployee(
    @Param('employeeId') employeeId: string,
    @Body() dto: SendToEmployeeDto,
  ) {
    await this.push.createAndSendToEmployee(employeeId, dto);
    return { status: 'queued' };
  }

  @Get('expo-notifications/unread-count/:employeeId')
  async getUnreadCount(@Param('employeeId') employeeId: string) {
    return this.push.getUnreadCount(employeeId);
  }

  @Get('expo-notifications/:employeeId')
  async getNotificationsForEmployee(@Param('employeeId') employeeId: string) {
    return this.push.getNotificationsForEmployee(employeeId);
  }

  @Patch('expo-notifications/:id/read')
  async markRead(@Param('id') id: string) {
    return this.push.markRead(id);
  }
}
