import { Module } from '@nestjs/common';
import { OnboardingModule } from './onboarding/onboarding.module';
import { OffboardingModule } from './offboarding/offboarding.module';

@Module({
  imports: [OnboardingModule, OffboardingModule],
  exports: [OnboardingModule],
})
export class LifecycleModule {}
