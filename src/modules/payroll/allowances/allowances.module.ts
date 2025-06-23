import { Module } from '@nestjs/common';
import { AllowancesService } from './allowances.service';
import { AllowancesController } from './allowances.controller';

@Module({
  controllers: [AllowancesController],
  providers: [AllowancesService],
})
export class AllowancesModule {}
