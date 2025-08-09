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
var LeavePolicyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavePolicyService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const leave_policies_schema_1 = require("../schema/leave-policies.schema");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_bulk_policy_dto_1 = require("./dto/create-bulk-policy.dto");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let LeavePolicyService = LeavePolicyService_1 = class LeavePolicyService {
    constructor(auditService, db, logger, cache) {
        this.auditService = auditService;
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.table = leave_policies_schema_1.leavePolicies;
        this.logger.setContext(LeavePolicyService_1.name);
    }
    oneKey(companyId, id) {
        return `company:${companyId}:leavepol:${id}:detail`;
    }
    listKey(companyId) {
        return `company:${companyId}:leavepol:list`;
    }
    byLeaveTypeKey(companyId, leaveTypeId) {
        return `company:${companyId}:leavepol:byType:${leaveTypeId}`;
    }
    accrualListKey(companyId, enabled) {
        return `company:${companyId}:leavepol:accrual:${enabled ? 'on' : 'off'}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            jobs.push(this.cache.del(this.accrualListKey(opts.companyId, true)));
            jobs.push(this.cache.del(this.accrualListKey(opts.companyId, false)));
            if (opts.leaveTypeId)
                jobs.push(this.cache.del(this.byLeaveTypeKey(opts.companyId, opts.leaveTypeId)));
            if (opts.id)
                jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:leavepol');
    }
    async bulkCreateLeavePolicies(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'leavepol:bulkCreate:start');
        const leaveTypesList = await this.db
            .select({ id: leave_types_schema_1.leaveTypes.id, name: leave_types_schema_1.leaveTypes.name })
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId))
            .execute();
        const leaveTypeMap = new Map(leaveTypesList.map((lt) => [lt.name.toLowerCase(), lt.id]));
        const dtos = [];
        for (const row of rows) {
            const leaveTypeName = (row['LeaveTypeName'] ||
                row['leaveTypeName'] ||
                '').toLowerCase();
            const leaveTypeId = leaveTypeMap.get(leaveTypeName);
            if (!leaveTypeId) {
                this.logger.warn({ leaveTypeName }, 'leavepol:bulkCreate:missing-leavetype');
                throw new common_1.BadRequestException(`Leave type "${leaveTypeName}" not found.`);
            }
            const normalizeBool = (val) => String(val).toLowerCase() === 'true';
            const eligibilityRules = {};
            if (row['MinTenureMonths']) {
                eligibilityRules.minTenureMonths = Number(row['MinTenureMonths']);
            }
            if (normalizeBool(row['RequiresManagerApproval'])) {
                eligibilityRules.requiresManagerApproval = true;
            }
            const dto = (0, class_transformer_1.plainToInstance)(create_bulk_policy_dto_1.BulkCreateLeavePolicyDto, {
                leaveTypeId,
                accrualEnabled: normalizeBool(row['AccrualEnabled']),
                accrualFrequency: row['AccrualFrequency'] || row['accrualFrequency'],
                accrualAmount: row['AccrualAmount'] || row['accrualAmount'],
                maxBalance: row['MaxBalance'] !== undefined
                    ? Number(row['MaxBalance'])
                    : undefined,
                allowCarryover: normalizeBool(row['AllowCarryover']),
                carryoverLimit: row['CarryoverLimit'] !== undefined
                    ? Number(row['CarryoverLimit'])
                    : undefined,
                onlyConfirmedEmployees: normalizeBool(row['OnlyConfirmedEmployees']),
                eligibilityRules: Object.keys(eligibilityRules).length
                    ? eligibilityRules
                    : undefined,
                genderEligibility: row['GenderEligibility'] || row['genderEligibility'],
                leaveNature: row['LeaveNature'] || row['leaveNature'],
                isSplittable: normalizeBool(row['IsSplittable']),
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                this.logger.warn({ errs }, 'leavepol:bulkCreate:validation-failed');
                throw new common_1.BadRequestException('Invalid data: ' + JSON.stringify(errs));
            }
            dtos.push(dto);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                leaveTypeId: d.leaveTypeId,
                accrualEnabled: d.accrualEnabled ?? false,
                accrualFrequency: d.accrualFrequency,
                accrualAmount: d.accrualAmount,
                maxBalance: d.maxBalance,
                allowCarryover: d.allowCarryover ?? false,
                carryoverLimit: d.carryoverLimit,
                onlyConfirmedEmployees: d.onlyConfirmedEmployees ?? false,
                eligibilityRules: d.eligibilityRules,
                genderEligibility: d.genderEligibility,
                leaveNature: d.leaveNature,
                isSplittable: d.isSplittable ?? false,
            }));
            return trx.insert(leave_policies_schema_1.leavePolicies).values(values).returning().execute();
        });
        await this.burst({ companyId });
        this.logger.info({ companyId, inserted: inserted.length }, 'leavepol:bulkCreate:done');
        return inserted;
    }
    async create(dto, user, ip) {
        const { companyId, id } = user;
        const leaveTypeId = dto.leaveTypeId;
        this.logger.info({ companyId, leaveTypeId, dto }, 'leavepol:create:start');
        const existing = await this.db
            .select({ id: this.table.id })
            .from(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId)))
            .execute();
        if (existing.length > 0) {
            this.logger.warn({ companyId, leaveTypeId }, 'leavepol:create:duplicate');
            throw new common_1.BadRequestException(`Leave policy for leave type ${leaveTypeId} already exists`);
        }
        const [leavePolicy] = await this.db
            .insert(this.table)
            .values({ companyId, ...dto })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'leave_policy',
            entityId: leavePolicy.id,
            details: 'Created new leave policy',
            userId: id,
            ipAddress: ip,
            changes: { ...dto },
        });
        await this.burst({ companyId, id: leavePolicy.id, leaveTypeId });
        this.logger.info({ id: leavePolicy.id }, 'leavepol:create:done');
        return leavePolicy;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'leavepol:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select({
                id: leave_policies_schema_1.leavePolicies.id,
                leaveTypeId: leave_policies_schema_1.leavePolicies.leaveTypeId,
                accrualEnabled: leave_policies_schema_1.leavePolicies.accrualEnabled,
                accrualFrequency: leave_policies_schema_1.leavePolicies.accrualFrequency,
                accrualAmount: leave_policies_schema_1.leavePolicies.accrualAmount,
                maxBalance: leave_policies_schema_1.leavePolicies.maxBalance,
                allowCarryover: leave_policies_schema_1.leavePolicies.allowCarryover,
                carryoverLimit: leave_policies_schema_1.leavePolicies.carryoverLimit,
                onlyConfirmedEmployees: leave_policies_schema_1.leavePolicies.onlyConfirmedEmployees,
                eligibilityRules: leave_policies_schema_1.leavePolicies.eligibilityRules,
                genderEligibility: leave_policies_schema_1.leavePolicies.genderEligibility,
                isSplittable: leave_policies_schema_1.leavePolicies.isSplittable,
                leaveTypeName: leave_types_schema_1.leaveTypes.name,
            })
                .from(this.table)
                .innerJoin(leave_types_schema_1.leaveTypes, (0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.leaveTypeId, leave_types_schema_1.leaveTypes.id))
                .where((0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'leavepol:list:db:done');
            return rows;
        });
    }
    async findLeavePoliciesByLeaveTypeId(companyId, leaveTypeId) {
        const key = this.byLeaveTypeKey(companyId, leaveTypeId);
        this.logger.debug({ key, companyId, leaveTypeId }, 'leavepol:byType:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(this.table.companyId, companyId)))
                .execute();
            return rows[0] ?? null;
        });
        if (!row) {
            this.logger.warn({ companyId, leaveTypeId }, 'leavepol:byType:not-found');
            throw new common_1.NotFoundException(`Leave policy with leave type id ${leaveTypeId} not found`);
        }
        return row;
    }
    async findOne(companyId, leavePolicyId) {
        const key = this.oneKey(companyId, leavePolicyId);
        this.logger.debug({ key, companyId, leavePolicyId }, 'leavepol:findOne:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(this.table)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.id, leavePolicyId)))
                .execute();
            return rows[0] ?? null;
        });
        if (!row) {
            this.logger.warn({ companyId, leavePolicyId }, 'leavepol:findOne:not-found');
            throw new common_1.NotFoundException(`Leave policy with id ${leavePolicyId} not found`);
        }
        return row;
    }
    async findAllAccrualPolicies(companyId) {
        const key = companyId ? this.accrualListKey(companyId, true) : undefined;
        if (key)
            this.logger.debug({ key, companyId }, 'leavepol:accrual:on:cache:get');
        const getter = async () => {
            const where = companyId
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.accrualEnabled, true), (0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.accrualEnabled, true));
            const rows = await this.db
                .select()
                .from(this.table)
                .where(where)
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'leavepol:accrual:on:db:done');
            return rows;
        };
        return key ? this.cache.getOrSetCache(key, getter) : getter();
    }
    findAllNonAccrualPolicies(companyId) {
        const key = companyId ? this.accrualListKey(companyId, false) : undefined;
        if (key)
            this.logger.debug({ key, companyId }, 'leavepol:accrual:off:cache:get');
        const getter = async () => {
            const where = companyId
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.accrualEnabled, false), (0, drizzle_orm_1.eq)(this.table.companyId, companyId))
                : (0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.accrualEnabled, false);
            const rows = await this.db
                .select()
                .from(leave_policies_schema_1.leavePolicies)
                .where(where)
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'leavepol:accrual:off:db:done');
            return rows;
        };
        return key ? this.cache.getOrSetCache(key, getter) : getter();
    }
    async update(leavePolicyId, dto, user, ip) {
        const { companyId, id } = user;
        this.logger.info({ companyId, leavePolicyId, dto }, 'leavepol:update:start');
        await this.findOne(companyId, leavePolicyId);
        const [leavePolicy] = await this.db
            .update(this.table)
            .set(dto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.id, leavePolicyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'leave_policy',
            entityId: leavePolicy.id,
            details: 'Updated leave policy',
            userId: id,
            ipAddress: ip,
            changes: { ...dto },
        });
        await this.burst({
            companyId,
            id: leavePolicyId,
            leaveTypeId: leavePolicy.leaveTypeId,
        });
        this.logger.info({ id: leavePolicyId }, 'leavepol:update:done');
        return leavePolicy;
    }
    async remove(leavePolicyId, user, ip) {
        const { companyId, id } = user;
        this.logger.info({ companyId, leavePolicyId }, 'leavepol:delete:start');
        const existing = await this.findOne(companyId, leavePolicyId);
        await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(this.table.companyId, companyId), (0, drizzle_orm_1.eq)(this.table.id, leavePolicyId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'leave_policy',
            entityId: leavePolicyId,
            details: 'Deleted leave policy',
            userId: id,
            ipAddress: ip,
        });
        await this.burst({
            companyId,
            id: leavePolicyId,
            leaveTypeId: existing.leaveTypeId,
        });
        this.logger.info({ id: leavePolicyId }, 'leavepol:delete:done');
        return { message: 'Leave policy deleted successfully' };
    }
};
exports.LeavePolicyService = LeavePolicyService;
exports.LeavePolicyService = LeavePolicyService = LeavePolicyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], LeavePolicyService);
//# sourceMappingURL=leave-policy.service.js.map