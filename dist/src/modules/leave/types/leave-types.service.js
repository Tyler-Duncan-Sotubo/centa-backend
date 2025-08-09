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
var LeaveTypesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveTypesService = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const leave_types_schema_1 = require("../schema/leave-types.schema");
const drizzle_orm_1 = require("drizzle-orm");
const create_leave_type_dto_1 = require("./dto/create-leave-type.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const leave_policies_schema_1 = require("../schema/leave-policies.schema");
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../common/cache/cache.service");
let LeaveTypesService = LeaveTypesService_1 = class LeaveTypesService {
    constructor(auditService, db, logger, cache) {
        this.auditService = auditService;
        this.db = db;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(LeaveTypesService_1.name);
    }
    oneKey(companyId, id) {
        return `company:${companyId}:leavetypes:${id}:detail`;
    }
    listKey(companyId) {
        return `company:${companyId}:leavetypes:list`;
    }
    nameKey(companyId, name) {
        return `company:${companyId}:leavetypes:name:${name.toLowerCase()}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId) {
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
            if (opts.id)
                jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
            if (opts.name)
                jobs.push(this.cache.del(this.nameKey(opts.companyId, opts.name)));
        }
        await Promise.allSettled(jobs);
        this.logger.debug({ ...opts }, 'cache:burst:leavetypes');
    }
    async bulkCreateLeaveTypes(companyId, rows) {
        this.logger.info({ companyId, rows: rows?.length ?? 0 }, 'leavetypes:bulkCreate:start');
        const dtos = [];
        for (const row of rows) {
            const dto = (0, class_transformer_1.plainToInstance)(create_leave_type_dto_1.CreateLeaveTypeDto, {
                name: row['Name'] || row['name'],
                isPaid: row['IsPaid'] !== undefined
                    ? row['IsPaid'] === 'true' || row['IsPaid'] === true
                    : undefined,
                colorTag: row['ColorTag'] || row['colorTag'],
            });
            const errs = await (0, class_validator_1.validate)(dto);
            if (errs.length) {
                this.logger.warn({ errs }, 'leavetypes:bulkCreate:validation-failed');
                throw new common_1.BadRequestException('Invalid CSV format or data: ' + JSON.stringify(errs));
            }
            dtos.push(dto);
        }
        const inputNames = dtos.map((d) => d.name.trim());
        const lowerToOriginal = new Map(inputNames.map((n) => [n.toLowerCase(), n]));
        if (lowerToOriginal.size !== inputNames.length) {
            const counts = {};
            inputNames.forEach((n) => (counts[n.toLowerCase()] = (counts[n.toLowerCase()] || 0) + 1));
            const dups = Object.entries(counts)
                .filter(([, c]) => c > 1)
                .map(([k]) => lowerToOriginal.get(k));
            this.logger.warn({ dups }, 'leavetypes:bulkCreate:input-duplicates');
            throw new common_1.BadRequestException(`Duplicate leave type names in file: ${dups?.join(', ')}`);
        }
        const duplicates = await this.db
            .select({ name: leave_types_schema_1.leaveTypes.name })
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.inArray)(leave_types_schema_1.leaveTypes.name, inputNames)))
            .execute();
        if (duplicates.length) {
            const duplicateNames = duplicates.map((d) => d.name);
            this.logger.warn({ duplicateNames }, 'leavetypes:bulkCreate:db-duplicates');
            throw new common_1.BadRequestException(`Leave type names already exist: ${duplicateNames.join(', ')}`);
        }
        const inserted = await this.db.transaction(async (trx) => {
            const values = dtos.map((d) => ({
                companyId,
                name: d.name,
                isPaid: d.isPaid ?? false,
                colorTag: d.colorTag || null,
            }));
            const result = await trx
                .insert(leave_types_schema_1.leaveTypes)
                .values(values)
                .returning({
                id: leave_types_schema_1.leaveTypes.id,
                name: leave_types_schema_1.leaveTypes.name,
                isPaid: leave_types_schema_1.leaveTypes.isPaid,
                colorTag: leave_types_schema_1.leaveTypes.colorTag,
            })
                .execute();
            return result;
        });
        await this.burst({ companyId });
        this.logger.info({ companyId, inserted: inserted.length }, 'leavetypes:bulkCreate:done');
        return inserted;
    }
    async create(dto, user, ip) {
        this.logger.info({ companyId: user.companyId, dto }, 'leavetypes:create:start');
        const existingLeaveType = await this.db
            .select({ id: leave_types_schema_1.leaveTypes.id })
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, user.companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.name, dto.name)))
            .execute();
        if (existingLeaveType.length > 0) {
            this.logger.warn({ companyId: user.companyId, name: dto.name }, 'leavetypes:create:duplicate');
            throw new common_1.BadRequestException(`Leave type with name ${dto.name} already exists`);
        }
        const [created] = await this.db
            .insert(leave_types_schema_1.leaveTypes)
            .values({
            companyId: user.companyId,
            name: dto.name,
            isPaid: dto.isPaid,
            colorTag: dto.colorTag,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'leave_type',
            entityId: created.id,
            details: 'Created new leave type',
            userId: user.id,
            ipAddress: ip,
            changes: { name: dto.name, isPaid: dto.isPaid, colorTag: dto.colorTag },
        });
        await this.burst({
            companyId: user.companyId,
            id: created.id,
            name: created.name,
        });
        this.logger.info({ id: created.id }, 'leavetypes:create:done');
        return created;
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ key, companyId }, 'leavetypes:list:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(leave_types_schema_1.leaveTypes)
                .where((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId))
                .execute();
            this.logger.debug({ companyId, count: rows.length }, 'leavetypes:list:db:done');
            return rows;
        });
    }
    async findOne(companyId, leaveTypeId) {
        const key = this.oneKey(companyId, leaveTypeId);
        this.logger.debug({ key, companyId, leaveTypeId }, 'leavetypes:findOne:cache:get');
        const row = await this.cache.getOrSetCache(key, async () => {
            const rows = await this.db
                .select()
                .from(leave_types_schema_1.leaveTypes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
                .execute();
            return rows[0] ?? null;
        });
        if (!row) {
            this.logger.warn({ companyId, leaveTypeId }, 'leavetypes:findOne:not-found');
            throw new common_1.NotFoundException(`Leave type with ID ${leaveTypeId} not found`);
        }
        return row;
    }
    async update(leaveTypeId, dto, user, ip) {
        const { companyId, id } = user;
        this.logger.info({ companyId, leaveTypeId, dto }, 'leavetypes:update:start');
        const existing = await this.findOne(companyId, leaveTypeId);
        const [updated] = await this.db
            .update(leave_types_schema_1.leaveTypes)
            .set({
            name: dto.name ?? existing.name,
            isPaid: dto.isPaid ?? existing.isPaid,
            colorTag: dto.colorTag ?? existing.colorTag,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'leave_type',
            entityId: leaveTypeId,
            userId: id,
            details: 'Updated leave type',
            ipAddress: ip,
            changes: { name: dto.name, isPaid: dto.isPaid, colorTag: dto.colorTag },
        });
        await this.burst({ companyId, id: leaveTypeId, name: updated.name });
        this.logger.info({ id: leaveTypeId }, 'leavetypes:update:done');
        return updated;
    }
    async remove(leaveTypeId, user, ip) {
        const { companyId, id } = user;
        this.logger.info({ companyId, leaveTypeId }, 'leavetypes:delete:start');
        await this.findOne(companyId, leaveTypeId);
        const policyExists = await this.db
            .select({ id: leave_policies_schema_1.leavePolicies.id })
            .from(leave_policies_schema_1.leavePolicies)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.leaveTypeId, leaveTypeId), (0, drizzle_orm_1.eq)(leave_policies_schema_1.leavePolicies.companyId, companyId)))
            .execute();
        if (policyExists && policyExists.length > 0) {
            this.logger.warn({ companyId, leaveTypeId, count: policyExists.length }, 'leavetypes:delete:has-policies');
            throw new common_1.BadRequestException("Cannot delete leave type: it's used by one or more leave policies.");
        }
        await this.db
            .delete(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'leave_type',
            entityId: leaveTypeId,
            details: 'Deleted leave type',
            userId: id,
            ipAddress: ip,
        });
        await this.burst({ companyId, id: leaveTypeId });
        this.logger.info({ id: leaveTypeId }, 'leavetypes:delete:done');
        return { success: true, message: 'Leave type deleted successfully' };
    }
};
exports.LeaveTypesService = LeaveTypesService;
exports.LeaveTypesService = LeaveTypesService = LeaveTypesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [audit_service_1.AuditService, Object, nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], LeaveTypesService);
//# sourceMappingURL=leave-types.service.js.map