import { Module } from '@nestjs/common';
import { JobRolesService } from './job-roles.service';
import { JobRolesController } from './job-roles.controller';

@Module({
  controllers: [JobRolesController],
  providers: [JobRolesService],
  exports: [JobRolesService],
})
export class JobRolesModule {}
