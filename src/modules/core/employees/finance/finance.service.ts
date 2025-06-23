import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFinanceDto } from './dto/create-finance.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { eq } from 'drizzle-orm';
import { employeeFinancials } from '../schema/finance.schema';
import { decrypt } from 'src/utils/crypto.util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const https = require('https');
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FinanceService {
  protected table = employeeFinancials;
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async upsert(
    employeeId: string,
    dto: CreateFinanceDto,
    userId: string,
    ip: string,
  ) {
    // Check if Employee exists
    const [employee] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .execute();

    if (employee) {
      const [updated] = await this.db
        .update(this.table)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(this.table.employeeId, employeeId))
        .returning()
        .execute();

      const changes: Record<string, any> = {};
      for (const key of Object.keys(dto)) {
        const before = (employee as any)[key];
        const after = (dto as any)[key];
        if (before !== after) {
          changes[key] = { before, after };
        }
      }
      if (Object.keys(changes).length) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'Employee Financials',
          details: 'Updated employee financials',
          userId,
          entityId: employeeId,
          ipAddress: ip,
          changes,
        });
      }

      return updated;
    } else {
      const [created] = await this.db
        .insert(this.table)
        .values({ employeeId, ...dto })
        .returning()
        .execute();

      await this.auditService.logAction({
        action: 'create',
        entity: 'Employee Financials',
        details: 'Created new employee financials',
        userId,
        entityId: employeeId,
        ipAddress: ip,
        changes: { ...dto },
      });

      return created;
    }
  }

  async findOne(employeeId: string) {
    const [finance] = await this.db
      .select()
      .from(employeeFinancials)
      .where(eq(employeeFinancials.employeeId, employeeId))
      .execute();

    if (!finance) {
      return {};
    }

    // apply decryption to each encrypted field
    return {
      ...finance,
      bankAccountName: finance.bankAccountName
        ? decrypt(finance.bankAccountName)
        : null,
      bankName: finance.bankName ? decrypt(finance.bankName) : null,
      bankAccountNumber: finance.bankAccountNumber
        ? decrypt(finance.bankAccountNumber)
        : null,
      bankBranch: finance.bankBranch ? decrypt(finance.bankBranch) : null,
      tin: finance.tin ? decrypt(finance.tin) : null,
      pensionPin: finance.pensionPin ? decrypt(finance.pensionPin) : null,
      nhfNumber: finance.nhfNumber ? decrypt(finance.nhfNumber) : null,
    };
  }

  async remove(employeeId: string) {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table.employeeId, employeeId))
      .returning({ id: this.table.employeeId })
      .execute();

    if (!result.length) {
      throw new NotFoundException(
        `Profile for employee ${employeeId} not found`,
      );
    }

    return { deleted: true, id: result[0].id };
  }

  async verifyBankAccount(accountNumber, bankCode) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`, // Secure API Key
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status) {
              resolve(response.data); // Successfully verified
            } else {
              reject(
                new BadRequestException(
                  response.message || 'Account verification failed',
                ),
              );
            }
          } catch (error) {
            console.error('Error parsing JSON response:', error);
            reject(new Error('Invalid JSON response from Paystack'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });

      req.end();
    });
  }
}
