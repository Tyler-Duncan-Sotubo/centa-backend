import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { PerformanceSettingsService } from './performance-settings.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';

@Controller('performance-settings')
export class PerformanceSettingsController extends BaseController {
  constructor(
    private readonly performanceSettingsService: PerformanceSettingsService,
  ) {
    super();
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['performance.settings'])
  async getPerformanceSettings(@CurrentUser() user: User) {
    return this.performanceSettingsService.getPerformanceSettings(
      user.companyId,
    );
  }

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['performance.settings'])
  async updatePerformanceSettings(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ): Promise<any> {
    return this.performanceSettingsService.updatePerformanceSetting(
      user.companyId,
      key,
      value,
    );
  }
}
