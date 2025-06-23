import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionSeedProcessor } from './permission-seed.processor';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionSeedProcessor],
})
export class PermissionsModule {}
