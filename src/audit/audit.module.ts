import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [DrizzleModule],
  controllers: [AuditController],
  providers: [AuditService, PrimaryGuard, JwtService],
})
export class AuditModule {}
