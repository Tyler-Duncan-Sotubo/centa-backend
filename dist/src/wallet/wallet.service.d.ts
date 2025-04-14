import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
export declare class WalletService {
    private config;
    private db;
    constructor(config: ConfigService, db: db);
    private getCompanyByUserId;
    private createCustomer;
    createDedicatedAccount(company_id: string): Promise<any>;
}
