import { WalletService } from './wallet.service';
import { User } from 'src/types/user.type';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    createCustomer(user: User): Promise<any>;
}
