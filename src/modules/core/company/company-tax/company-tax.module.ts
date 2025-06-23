import { Module } from '@nestjs/common';
import { CompanyTaxService } from './company-tax.service';
import { CompanyTaxController } from './company-tax.controller';

@Module({
  controllers: [CompanyTaxController],
  providers: [CompanyTaxService],
})
export class CompanyTaxModule {}
