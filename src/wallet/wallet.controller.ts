import { Controller, Post, SetMetadata, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin'])
  @Post('create-wallet')
  async createCustomer(@CurrentUser() user: User) {
    return this.walletService.createDedicatedAccount(user.company_id);
  }
}
