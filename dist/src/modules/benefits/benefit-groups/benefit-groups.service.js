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
exports.BenefitGroupsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const benefit_groups_schema_1 = require("../schema/benefit-groups.schema");
const benefit_plan_schema_1 = require("../schema/benefit-plan.schema");
const cache_service_1 = require("../../../common/cache/cache.service");
let BenefitGroupsService = class BenefitGroupsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    listKey(companyId) {
        return `company:${companyId}:benefit-groups:list`;
    }
    oneKey(id) {
        return `benefit-group:${id}:detail`;
    }
    async invalidate(companyId, id) {
        const jobs = [this.cache.del(this.listKey(companyId))];
        if (id)
            jobs.push(this.cache.del(this.oneKey(id)));
        await Promise.allSettled(jobs);
    }
    async create(dto, user) {
        const [existingGroup] = await this.db
            .select()
            .from(benefit_groups_schema_1.benefitGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.name, dto.name), (0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.companyId, user.companyId)))
            .execute();
        if (existingGroup)
            throw new common_1.BadRequestException('A benefit group with this name already exists.');
        const [newGroup] = await this.db
            .insert(benefit_groups_schema_1.benefitGroups)
            .values({ ...dto, companyId: user.companyId })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'benefitGroup',
            entityId: newGroup.id,
            userId: user.id,
            details: 'Created benefit group',
            changes: {
                name: newGroup.name,
                description: newGroup.description,
                companyId: newGroup.companyId,
                createdAt: newGroup.createdAt,
            },
        });
        await this.invalidate(user.companyId, newGroup.id);
        return newGroup;
    }
    async findAll(companyId) {
        return this.cache.getOrSetCache(this.listKey(companyId), async () => {
            return this.db
                .select()
                .from(benefit_groups_schema_1.benefitGroups)
                .where((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.companyId, companyId))
                .execute();
        });
    }
    async findOne(id) {
        return this.cache.getOrSetCache(this.oneKey(id), async () => {
            const [group] = await this.db
                .select()
                .from(benefit_groups_schema_1.benefitGroups)
                .where((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.id, id))
                .execute();
            if (!group)
                throw new common_1.BadRequestException('Benefit group not found');
            return group;
        });
    }
    async update(id, dto, user) {
        await this.findOne(id);
        const [updatedGroup] = await this.db
            .update(benefit_groups_schema_1.benefitGroups)
            .set({ ...dto, companyId: user.companyId })
            .where((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'benefitGroup',
            entityId: updatedGroup.id,
            userId: user.id,
            details: 'Updated benefit group',
            changes: {
                name: updatedGroup.name,
                description: updatedGroup.description,
                companyId: updatedGroup.companyId,
                createdAt: updatedGroup.createdAt,
            },
        });
        await this.invalidate(user.companyId, updatedGroup.id);
        return updatedGroup;
    }
    async remove(id, user) {
        const group = await this.findOne(id);
        const existingPlans = await this.db
            .select()
            .from(benefit_plan_schema_1.benefitPlans)
            .where((0, drizzle_orm_1.eq)(benefit_plan_schema_1.benefitPlans.benefitGroupId, id))
            .execute();
        if (existingPlans.length > 0) {
            throw new common_1.BadRequestException('Cannot delete benefit group with existing benefit plans.');
        }
        const [deletedGroup] = await this.db
            .delete(benefit_groups_schema_1.benefitGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.id, id), (0, drizzle_orm_1.eq)(benefit_groups_schema_1.benefitGroups.companyId, user.companyId)))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'benefitGroup',
            entityId: deletedGroup.id,
            userId: user.id,
            details: 'Deleted benefit group',
            changes: {
                name: deletedGroup.name,
                description: deletedGroup.description,
                companyId: deletedGroup.companyId,
                createdAt: deletedGroup.createdAt,
            },
        });
        await this.invalidate(user.companyId, group.id);
        return { success: true };
    }
};
exports.BenefitGroupsService = BenefitGroupsService;
exports.BenefitGroupsService = BenefitGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], BenefitGroupsService);
//# sourceMappingURL=benefit-groups.service.js.map