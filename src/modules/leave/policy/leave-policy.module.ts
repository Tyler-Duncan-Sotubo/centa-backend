import { Module } from '@nestjs/common';
import { LeavePolicyService } from './leave-policy.service';
import { LeavePolicyController } from './leave-policy.controller';

@Module({
  controllers: [LeavePolicyController],
  providers: [LeavePolicyService],
  exports: [LeavePolicyService],
})
export class LeavePolicyModule {}
