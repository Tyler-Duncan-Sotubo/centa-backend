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
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const finance_schema_1 = require("../schema/finance.schema");
const crypto_util_1 = require("../../../../utils/crypto.util");
const https = require('https');
const config_1 = require("@nestjs/config");
let FinanceService = class FinanceService {
    constructor(db, auditService, config) {
        this.db = db;
        this.auditService = auditService;
        this.config = config;
        this.table = finance_schema_1.employeeFinancials;
    }
    async upsert(employeeId, dto, userId, ip) {
        const [employee] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .execute();
        if (employee) {
            const [updated] = await this.db
                .update(this.table)
                .set({ ...dto, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
                .returning()
                .execute();
            const changes = {};
            for (const key of Object.keys(dto)) {
                const before = employee[key];
                const after = dto[key];
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
        }
        else {
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
    async findOne(employeeId) {
        const [finance] = await this.db
            .select()
            .from(finance_schema_1.employeeFinancials)
            .where((0, drizzle_orm_1.eq)(finance_schema_1.employeeFinancials.employeeId, employeeId))
            .execute();
        if (!finance) {
            return {};
        }
        return {
            ...finance,
            bankAccountName: finance.bankAccountName
                ? (0, crypto_util_1.decrypt)(finance.bankAccountName)
                : null,
            bankName: finance.bankName ? (0, crypto_util_1.decrypt)(finance.bankName) : null,
            bankAccountNumber: finance.bankAccountNumber
                ? (0, crypto_util_1.decrypt)(finance.bankAccountNumber)
                : null,
            bankBranch: finance.bankBranch ? (0, crypto_util_1.decrypt)(finance.bankBranch) : null,
            tin: finance.tin ? (0, crypto_util_1.decrypt)(finance.tin) : null,
            pensionPin: finance.pensionPin ? (0, crypto_util_1.decrypt)(finance.pensionPin) : null,
            nhfNumber: finance.nhfNumber ? (0, crypto_util_1.decrypt)(finance.nhfNumber) : null,
        };
    }
    async remove(employeeId) {
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .returning({ id: this.table.employeeId })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`Profile for employee ${employeeId} not found`);
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
                    Authorization: `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`,
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
                            resolve(response.data);
                        }
                        else {
                            reject(new common_1.BadRequestException(response.message || 'Account verification failed'));
                        }
                    }
                    catch (error) {
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
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        config_1.ConfigService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map