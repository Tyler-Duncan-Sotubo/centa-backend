import { Module } from '@nestjs/common';
import { AssetsSettingsController } from './assets-settings.controller';
import { AssetsSettingsService } from './assets-settings.service';

@Module({
  controllers: [AssetsSettingsController],
  providers: [AssetsSettingsService],
  exports: [AssetsSettingsService],
})
export class AssetsSettingsModule {}
