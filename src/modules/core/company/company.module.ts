import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { LocationsModule } from './locations/locations.module';
import { CompanyTaxModule } from './company-tax/company-tax.module';
import { OnboardingSeederService } from 'src/modules/lifecycle/onboarding/seeder.service';
import { DocumentsModule } from './documents/documents.module';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, OnboardingSeederService],
  imports: [LocationsModule, CompanyTaxModule, DocumentsModule],
  exports: [CompanyService, LocationsModule],
})
export class CompanyModule {}
