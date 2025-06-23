import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingSeederService } from './seeder.service';
import { OnboardingSeederController } from './seeder.controller';

@Module({
  controllers: [OnboardingController, OnboardingSeederController],
  providers: [OnboardingService, OnboardingSeederService],
  exports: [OnboardingService, OnboardingSeederService],
})
export class OnboardingModule {}
