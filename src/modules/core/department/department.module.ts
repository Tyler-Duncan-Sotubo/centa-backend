import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { DepartmentWriteService } from './department-write.service';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentWriteService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
