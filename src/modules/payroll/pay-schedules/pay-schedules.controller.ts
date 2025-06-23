import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  SetMetadata,
  Ip,
  Delete,
} from '@nestjs/common';
import { PaySchedulesService } from './pay-schedules.service';
import { CreatePayScheduleDto } from './dto/create-pay-schedule.dto';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('pay-schedules')
export class PaySchedulesController extends BaseController {
  constructor(private readonly paySchedulesService: PaySchedulesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.manage'])
  createPaySchedule(
    @Body() dto: CreatePayScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.paySchedulesService.createPayFrequency(user.companyId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.read'])
  listPaySchedules(@CurrentUser() user: User) {
    return this.paySchedulesService.getCompanyPaySchedule(user.companyId);
  }

  @Get(':scheduleId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.read'])
  findOne(@Param('scheduleId') scheduleId: string) {
    return this.paySchedulesService.findOne(scheduleId);
  }

  @Get('next-pay-date')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.read'])
  getNextPayDate(@CurrentUser() user: User) {
    return this.paySchedulesService.getNextPayDate(user.companyId);
  }

  @Get('raw')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.read'])
  getRawPaySchedules(@CurrentUser() user: User) {
    return this.paySchedulesService.listPaySchedulesForCompany(user.companyId);
  }

  @Patch(':scheduleId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.manage'])
  updatePaySchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: CreatePayScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.paySchedulesService.updatePayFrequency(user, dto, scheduleId);
  }

  @Delete(':scheduleId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.pay_schedules.manage'])
  deletePaySchedule(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.paySchedulesService.deletePaySchedule(scheduleId, user, ip);
  }
}
