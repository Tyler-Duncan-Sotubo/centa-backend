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
import { CreateMessageDto } from './dto/create-message.dto';
import { ContactEmailService } from './services/contact-email.service';
// import { BroadcastAppUpdateDto } from './dto/broadcast-app-update.dto';

@Controller('')
export class NotificationController extends BaseController {
  constructor(
    private pusher: PusherService,
    private push: PushNotificationService,
    private contactEmailService: ContactEmailService,
  ) {
    super();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-notifications')
  async getUserNotifications(@CurrentUser() user: User) {
    return this.pusher.getUserNotifications(user.companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee-notifications/:employeeId')
  async getEmployeeNotifications(
    @CurrentUser() user: User,
    @Param('employeeId') employeeId: string,
  ) {
    return this.pusher.getEmployeeNotifications(user.companyId, employeeId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('mark-as-read/:id')
  async markAsRead(@Param('id') id: string) {
    return this.pusher.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Delete('devices/:token')
  async unregisterDevice(@Param('token') token: string) {
    await this.push.deleteToken(token);
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-notifications/:employeeId')
  async sendToEmployee(
    @Param('employeeId') employeeId: string,
    @Body() dto: SendToEmployeeDto,
  ) {
    await this.push.createAndSendToEmployee(employeeId, dto);
    return { status: 'queued' };
  }

  // @Post('broadcast-app-update')
  // async broadcastAppUpdate(@Body() dto: BroadcastAppUpdateDto) {
  //   const { platforms, durable, ...msg } = dto;
  //   const res = await this.push.broadcastAppUpdate(msg, {
  //     platforms,
  //     durable,
  //   });
  //   return { status: 'queued', ...res };
  // }

  @UseGuards(JwtAuthGuard)
  @Get('expo-notifications/unread-count/:employeeId')
  async getUnreadCount(@Param('employeeId') employeeId: string) {
    return this.push.getUnreadCount(employeeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expo-notifications/:employeeId')
  async getNotificationsForEmployee(@Param('employeeId') employeeId: string) {
    return this.push.getNotificationsForEmployee(employeeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('expo-notifications/:id/read')
  async markRead(@Param('id') id: string) {
    return this.push.markRead(id);
  }

  @Post('email-contact')
  async sendContactEmail(@Body() dto: CreateMessageDto) {
    await this.contactEmailService.sendContactEmail(dto);
    return { status: 'queued' };
  }
}
