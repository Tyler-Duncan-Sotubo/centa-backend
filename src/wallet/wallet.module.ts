import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [DrizzleModule],
  controllers: [WalletController],
  providers: [WalletService, PrimaryGuard, JwtService],
})
export class WalletModule {}
