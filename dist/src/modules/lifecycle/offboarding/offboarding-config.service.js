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
exports.OffboardingConfigService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const audit_service_1 = require("../../audit/audit.service");
let OffboardingConfigService = class OffboardingConfigService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async getAllTerminationConfig(companyId) {
        const [types, reasons, checklist] = await Promise.all([
            this.db
                .select()
                .from(schema_1.termination_types)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.termination_types.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.termination_types.isGlobal, true))),
            this.db
                .select()
                .from(schema_1.termination_reasons)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.termination_reasons.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.termination_reasons.isGlobal, true))),
            this.db
                .select()
                .from(schema_1.termination_checklist_items)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.termination_checklist_items.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.termination_checklist_items.isGlobal, true)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.termination_checklist_items.order)),
        ]);
        return {
            types,
            reasons,
            checklist,
        };
    }
    async createType(user, dto) {
        const { companyId, id: userId } = user;
        const exists = await this.db.query.termination_types.findFirst({
            where: (t, { eq }) => eq(t.name, dto.name),
        });
        if (exists) {
            throw new common_1.BadRequestException(`Termination type "${dto.name}" already exists.`);
        }
        const type = await this.db
            .insert(schema_1.termination_types)
            .values({ ...dto, companyId })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'termination_type',
            entityId: type[0].id,
            userId,
            details: 'Created termination type: ' + name,
            changes: { name, companyId },
        });
        return type;
    }
    async updateType(id, dto, user) {
        const exists = await this.db.query.termination_types.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Termination type with ID ${id} does not exist.`);
        }
        const updated = await this.db
            .update(schema_1.termination_types)
            .set({ name: dto.name, description: dto.description ?? null })
            .where((0, drizzle_orm_1.eq)(schema_1.termination_types.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'termination_type',
            entityId: id,
            userId: user.id,
            details: 'Updated termination type: ' + name,
            changes: { name },
        });
        return updated;
    }
    async deleteType(id, user) {
        const exists = await this.db.query.termination_types.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Termination type with ID ${id} does not exist.`);
        }
        await this.db.delete(schema_1.termination_types).where((0, drizzle_orm_1.eq)(schema_1.termination_types.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'termination_type',
            entityId: id,
            userId: user.id,
            details: 'Deleted termination type with ID: ' + id,
            changes: { id },
        });
    }
    async createReason(user, dto) {
        const { companyId, id: userId } = user;
        const exists = await this.db.query.termination_reasons.findFirst({
            where: (r, { eq }) => eq(r.name, dto.name),
        });
        if (exists) {
            throw new common_1.BadRequestException(`Termination reason "${dto.name}" already exists.`);
        }
        const reason = await this.db
            .insert(schema_1.termination_reasons)
            .values({ ...dto, companyId })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'termination_reason',
            entityId: reason[0].id,
            userId,
            details: 'Created termination reason: ' + dto.name,
            changes: { name: dto.name, companyId },
        });
        return reason;
    }
    async updateReason(id, dto, user) {
        const exists = await this.db.query.termination_reasons.findFirst({
            where: (r, { eq }) => eq(r.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Termination reason with ID ${id} does not exist.`);
        }
        const updated = await this.db
            .update(schema_1.termination_reasons)
            .set({ name: dto.name, description: dto.description ?? null })
            .where((0, drizzle_orm_1.eq)(schema_1.termination_reasons.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'termination_reason',
            entityId: id,
            userId: user.id,
            details: 'Updated termination reason: ' + name,
            changes: { name },
        });
        return updated;
    }
    async deleteReason(id, user) {
        const exists = await this.db.query.termination_reasons.findFirst({
            where: (r, { eq }) => eq(r.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Termination reason with ID ${id} does not exist.`);
        }
        await this.db
            .delete(schema_1.termination_reasons)
            .where((0, drizzle_orm_1.eq)(schema_1.termination_reasons.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'termination_reason',
            entityId: id,
            userId: user.id,
            details: 'Deleted termination reason with ID: ' + id,
            changes: { id },
        });
    }
    async createChecklistItem(user, dto) {
        const { companyId, id: userId } = user;
        const exists = await this.db.query.termination_checklist_items.findFirst({
            where: (i, { eq }) => eq(i.name, dto.name),
        });
        if (exists) {
            throw new common_1.BadRequestException(`Checklist item "${dto.name}" already exists.`);
        }
        const [last] = await this.db
            .select({ order: schema_1.termination_checklist_items.order })
            .from(schema_1.termination_checklist_items)
            .where((0, drizzle_orm_1.eq)(schema_1.termination_checklist_items.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.termination_checklist_items.order))
            .limit(1);
        const nextOrder = (last?.order ?? 0) + 1;
        const [item] = await this.db
            .insert(schema_1.termination_checklist_items)
            .values({
            ...dto,
            companyId,
            isGlobal: false,
            isAssetReturnStep: dto.isAssetReturnStep ?? false,
            order: nextOrder,
            createdAt: new Date(),
        })
            .returning();
        await this.auditService.logAction({
            action: 'create',
            entity: 'termination_checklist_item',
            entityId: item.id,
            userId,
            details: 'Created checklist item: ' + dto.name,
            changes: { ...dto },
        });
        return item;
    }
    async updateChecklistItem(id, data, user) {
        const exists = await this.db.query.termination_checklist_items.findFirst({
            where: (i, { eq }) => eq(i.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Checklist item with ID ${id} does not exist.`);
        }
        const updateData = {
            name: data.name,
            description: data.description ?? null,
            isAssetReturnStep: data.isAssetReturnStep ?? false,
        };
        const [updated] = await this.db
            .update(schema_1.termination_checklist_items)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.termination_checklist_items.id, id))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'termination_checklist_item',
            entityId: id,
            userId: user.id,
            details: 'Updated checklist item: ' + data.name,
            changes: updateData,
        });
        return updated;
    }
    async deleteChecklistItem(id, user) {
        const exists = await this.db.query.termination_checklist_items.findFirst({
            where: (i, { eq }) => eq(i.id, id),
        });
        if (!exists) {
            throw new common_1.BadRequestException(`Checklist item with ID ${id} does not exist.`);
        }
        await this.db
            .delete(schema_1.termination_checklist_items)
            .where((0, drizzle_orm_1.eq)(schema_1.termination_checklist_items.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'termination_checklist_item',
            entityId: id,
            userId: user.id,
            details: 'Deleted checklist item with ID: ' + id,
            changes: { id },
        });
    }
};
exports.OffboardingConfigService = OffboardingConfigService;
exports.OffboardingConfigService = OffboardingConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], OffboardingConfigService);
//# sourceMappingURL=offboarding-config.service.js.map