import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { customers, wallets } from 'src/drizzle/schema/wallet.schema';
import { companies } from 'src/drizzle/schema/company.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class WalletService {
  constructor(
    private config: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  private async getCompanyByUserId(company_id: string) {
    const result = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        email: companies.email,
        phone: companies.phone_number,
      })
      .from(companies)
      .where(eq(companies.id, company_id))
      .execute();

    if (result.length === 0) {
      throw new NotFoundException('Company not found');
    }

    return result[0]; // Return the first matching user
  }

  private async createCustomer(company_id: string) {
    // Get the company details
    const company = await this.getCompanyByUserId(company_id);

    // Check if the customer already exists
    const existingCustomer = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, company.email!))
      .execute();

    if (existingCustomer.length > 0) {
      return existingCustomer[0];
    }

    try {
      const response = await axios.post(
        'https://api.paystack.co/customer',
        {
          email: company.email,
          first_name: company.name,
          phone: company.phone,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`, // Secure API Key
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status === true) {
        await this.db
          .insert(customers)
          .values({
            id: response.data.data.id, // paystack customer id
            email: response.data.data.email,
            customer_code: response.data.data.customer_code,
            created_at: new Date(response.data.data.createdAt),
            updated_at: new Date(response.data.data.updatedAt),
          })
          .execute();

        return response.data.data;
      }
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      throw new Error('Failed to create customer');
    }
  }

  async createDedicatedAccount(company_id: string) {
    // get customer id from the database or create a new customer
    const customer = await this.createCustomer(company_id);

    // Check if the customer was created successfully
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if the dedicated account already exists
    const existingAccount = await this.db
      .select()
      .from(wallets)
      .where(eq(wallets.customer_id, customer.id))
      .execute();

    if (existingAccount.length > 0) {
      return existingAccount[0];
    }

    // Create a new dedicated account
    try {
      const response = await axios.post(
        'https://api.paystack.co/dedicated_account',
        {
          customer: customer.id,
          preferred_bank: 'wema-bank',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.status === false) {
        throw new Error('Failed to create dedicated account');
      }

      const {
        id,
        currency,
        account_name,
        account_number,
        bank: { id: bank_id, name: bank_name, slug: bank_slug },
      } = response.data.data;

      // Save the dedicated account details to the database
      await this.db
        .insert(wallets)
        .values({
          id,
          customer_id: customer.id,
          customer_code: customer.customer_code,
          bank_id,
          bank_name,
          bank_slug,
          currency,
          account_name,
          account_number,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      console.log(response.data);
      return response.data;
    } catch (error: any) {
      console.error(error.response?.data || error.message);
      throw new Error('Failed to create Dedicated Account');
    }
  }
}
