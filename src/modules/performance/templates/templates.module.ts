import { Module } from '@nestjs/common';
import { PerformanceTemplatesService } from './templates.service';
import { PerformanceTemplatesController } from './templates.controller';
import { SeedModule } from './seed/seed.module';

@Module({
  controllers: [PerformanceTemplatesController],
  providers: [PerformanceTemplatesService],
  imports: [SeedModule],
})
export class TemplatesModule {}
