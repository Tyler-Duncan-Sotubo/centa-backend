import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Module({
  imports: [DrizzleModule],
  controllers: [AuditController],
  providers: [AuditService, JwtGuard],
})
export class AuditModule {}
