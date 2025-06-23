import { Module } from '@nestjs/common';
import { PayGroupsService } from './pay-groups.service';
import { PayGroupsController } from './pay-groups.controller';

@Module({
  controllers: [PayGroupsController],
  providers: [PayGroupsService],
  exports: [PayGroupsService],
})
export class PayGroupsModule {}
