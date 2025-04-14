"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const wallet_schema_1 = require("../drizzle/schema/wallet.schema");
const company_schema_1 = require("../drizzle/schema/company.schema");
const drizzle_orm_1 = require("drizzle-orm");
let WalletService = class WalletService {
    constructor(config, db) {
        this.config = config;
        this.db = db;
    }
    async getCompanyByUserId(company_id) {
        const result = await this.db
            .select({
            id: company_schema_1.companies.id,
            name: company_schema_1.companies.name,
            email: company_schema_1.companies.email,
            phone: company_schema_1.companies.phone_number,
        })
            .from(company_schema_1.companies)
            .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
            .execute();
        if (result.length === 0) {
            throw new common_1.NotFoundException('Company not found');
        }
        return result[0];
    }
    async createCustomer(company_id) {
        const company = await this.getCompanyByUserId(company_id);
        const existingCustomer = await this.db
            .select()
            .from(wallet_schema_1.customers)
            .where((0, drizzle_orm_1.eq)(wallet_schema_1.customers.email, company.email))
            .execute();
        if (existingCustomer.length > 0) {
            return existingCustomer[0];
        }
        try {
            const response = await axios_1.default.post('https://api.paystack.co/customer', {
                email: company.email,
                first_name: company.name,
                phone: company.phone,
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.status === true) {
                await this.db
                    .insert(wallet_schema_1.customers)
                    .values({
                    id: response.data.data.id,
                    email: response.data.data.email,
                    customer_code: response.data.data.customer_code,
                    created_at: new Date(response.data.data.createdAt),
                    updated_at: new Date(response.data.data.updatedAt),
                })
                    .execute();
                return response.data.data;
            }
        }
        catch (error) {
            console.error(error.response?.data || error.message);
            throw new Error('Failed to create customer');
        }
    }
    async createDedicatedAccount(company_id) {
        const customer = await this.createCustomer(company_id);
        if (!customer) {
            throw new common_1.NotFoundException('Customer not found');
        }
        const existingAccount = await this.db
            .select()
            .from(wallet_schema_1.wallets)
            .where((0, drizzle_orm_1.eq)(wallet_schema_1.wallets.customer_id, customer.id))
            .execute();
        if (existingAccount.length > 0) {
            return existingAccount[0];
        }
        try {
            const response = await axios_1.default.post('https://api.paystack.co/dedicated_account', {
                customer: customer.id,
                preferred_bank: 'wema-bank',
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data.status === false) {
                throw new Error('Failed to create dedicated account');
            }
            const { id, currency, account_name, account_number, bank: { id: bank_id, name: bank_name, slug: bank_slug }, } = response.data.data;
            await this.db
                .insert(wallet_schema_1.wallets)
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
        }
        catch (error) {
            console.error(error.response?.data || error.message);
            throw new Error('Failed to create Dedicated Account');
        }
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], WalletService);
//# sourceMappingURL=wallet.service.js.map