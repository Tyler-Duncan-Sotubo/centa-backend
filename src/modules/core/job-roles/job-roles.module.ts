import { Module } from '@nestjs/common';
import { JobRolesService } from './job-roles.service';
import { JobRolesController } from './job-roles.controller';
import { JobRolesWriteService } from './job-roles-write.service';

@Module({
  controllers: [JobRolesController],
  providers: [JobRolesService, JobRolesWriteService],
  exports: [JobRolesService, JobRolesWriteService],
})
export class JobRolesModule {}
