import { Module } from '@nestjs/common';
import { AssetsRequestService } from './assets-request.service';
import { AssetsRequestController } from './assets-request.controller';
import { AssetsSettingsService } from '../settings/assets-settings.service';

@Module({
  controllers: [AssetsRequestController],
  providers: [AssetsRequestService, AssetsSettingsService],
})
export class AssetsRequestModule {}
