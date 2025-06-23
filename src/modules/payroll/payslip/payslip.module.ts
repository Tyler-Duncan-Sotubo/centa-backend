import { Module } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { PayslipController } from './payslip.controller';
import { AwsService } from 'src/common/aws/aws.service';
import { BullModule } from '@nestjs/bullmq';
import { S3StorageService } from 'src/common/aws/s3-storage.service';

@Module({
  controllers: [PayslipController],
  providers: [PayslipService, AwsService, S3StorageService],
  exports: [PayslipService],
  imports: [
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
  ],
})
export class PayslipModule {}
