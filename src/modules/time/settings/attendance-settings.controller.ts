import {
  Body,
  Controller,
  Get,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AttendanceSettingsService } from './attendance-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

@Controller('attendance-settings')
export class AttendanceSettingsController extends BaseController {
  constructor(
    private readonly attendanceSettingsService: AttendanceSettingsService,
  ) {
    super();
  }

  @Get('options')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.settings'])
  async getAllAttendanceSettings(@CurrentUser() user: User) {
    return this.attendanceSettingsService.getAttendanceSettings(user.companyId);
  }

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['attendance.settings'])
  async updateAttendanceSettings(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ): Promise<any> {
    return this.attendanceSettingsService.updateAttendanceSetting(
      user.companyId,
      key,
      value,
    );
  }
}
