import { Module } from '@nestjs/common';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [OnboardingModule],
  exports: [OnboardingModule],
})
export class LifecycleModule {}
