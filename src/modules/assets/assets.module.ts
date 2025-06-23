import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { UsefulLifeService } from './useful-life.service';
import { AssetsRequestModule } from './assets-request/assets-request.module';
import { AssetsReportModule } from './assets-report/assets-report.module';
import { AssetsSettingsModule } from './settings/assets-settings.module';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, UsefulLifeService],
  imports: [AssetsRequestModule, AssetsReportModule, AssetsSettingsModule],
})
export class AssetsModule {}
