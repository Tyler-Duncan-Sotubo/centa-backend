import {
  Body,
  Controller,
  Get,
  SetMetadata,
  UseGuards,
  Post,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { User } from 'src/common/types/user.type';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('holidays')
export class HolidaysController extends BaseController {
  constructor(private readonly holidaysService: HolidaysService) {
    super();
  }

  // @Get('year-public-holidays')
  // async getYearPublicHolidays() {
  //   return this.holidaysService.insertHolidaysForCurrentYear('NG');
  // }

  @Get('custom-holidays')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.read'])
  async getCustomHolidays(@CurrentUser() user: User) {
    return this.holidaysService.findAll(user.companyId);
  }

  @Get('upcoming-holidays')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.read'])
  async getUpcomingPublicHolidays(@CurrentUser() user: User) {
    return this.holidaysService.getUpcomingPublicHolidays('NG', user.companyId);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.manage'])
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 200 }))
  async bulkCreateLeavePolicies(
    @Body() rows: any[],
    @CurrentUser() user: User,
  ) {
    return this.holidaysService.bulkCreateHolidays(user.companyId, rows);
  }

  @Post('custom-holidays')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.manage'])
  async createCustomHolidays(
    @Body() dto: CreateHolidayDto,
    @CurrentUser() user: User,
  ) {
    return this.holidaysService.createHoliday(dto, user);
  }

  @Patch('update-holiday/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.manage'])
  async updateHoliday(
    @Body() dto: UpdateHolidayDto,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.holidaysService.update(id, dto, user);
  }

  @Delete('delete-holiday/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['holidays.manage'])
  async deleteHoliday(@CurrentUser() user: User, @Param('id') id: string) {
    return this.holidaysService.delete(id, user);
  }
}
