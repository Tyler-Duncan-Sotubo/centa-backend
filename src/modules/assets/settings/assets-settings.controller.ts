import {
  Body,
  Controller,
  Get,
  Patch,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AssetsSettingsService } from './assets-settings.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('asset-settings')
export class AssetsSettingsController extends BaseController {
  constructor(private readonly assetsSettingsService: AssetsSettingsService) {
    super();
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async getAssetSettings(@CurrentUser() user: User) {
    return this.assetsSettingsService.getAssetSettings(user.companyId);
  }

  @Patch('update-asset-setting')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async updateAssetSetting(
    @CurrentUser() user: User,
    @Body('key') key: string,
    @Body('value') value: any,
  ) {
    return this.assetsSettingsService.updateAssetSetting(
      user.companyId,
      key,
      value,
    );
  }
}
