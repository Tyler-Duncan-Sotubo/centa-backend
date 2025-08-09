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
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const announcements_schema_1 = require("./schema/announcements.schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../audit/audit.service");
const cache_service_1 = require("../../common/cache/cache.service");
let CategoryService = class CategoryService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    categoriesKey(companyId) {
        return `company:${companyId}:announcement-categories`;
    }
    async invalidateCategories(companyId) {
        await this.cache.del(this.categoriesKey(companyId));
    }
    async createCategory(name, user) {
        const [existing] = await this.db
            .select({ id: announcements_schema_1.announcementCategories.id })
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.name, name), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, user.companyId)))
            .limit(1)
            .execute();
        if (existing) {
            throw new common_1.BadRequestException('Category name already exists');
        }
        const [newCategory] = await this.db
            .insert(announcements_schema_1.announcementCategories)
            .values({
            companyId: user.companyId,
            name,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'announcement_category',
            entityId: newCategory.id,
            userId: user.id,
            details: `Created category ${name} for company ${user.companyId}`,
            changes: {
                name: newCategory.name,
                companyId: newCategory.companyId,
            },
        });
        await this.invalidateCategories(user.companyId);
        return newCategory;
    }
    async updateCategory(id, name, user) {
        const [existing] = await this.db
            .select({
            id: announcements_schema_1.announcementCategories.id,
            companyId: announcements_schema_1.announcementCategories.companyId,
            name: announcements_schema_1.announcementCategories.name,
        })
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .limit(1)
            .execute();
        if (!existing)
            throw new common_1.BadRequestException('Category not found');
        if (name && name !== existing.name) {
            const [dup] = await this.db
                .select({ id: announcements_schema_1.announcementCategories.id })
                .from(announcements_schema_1.announcementCategories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, existing.companyId), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.name, name)))
                .limit(1)
                .execute();
            if (dup)
                throw new common_1.BadRequestException('Category name already exists');
        }
        const [updated] = await this.db
            .update(announcements_schema_1.announcementCategories)
            .set({ name })
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'announcement_category',
            entityId: updated.id,
            userId: user.id,
            details: `Updated category ${id} to ${name} for company ${existing.companyId}`,
            changes: {
                name: updated.name,
                companyId: updated.companyId,
            },
        });
        await this.invalidateCategories(existing.companyId);
        return updated;
    }
    async deleteCategory(id, user) {
        const [existing] = await this.db
            .select({
            id: announcements_schema_1.announcementCategories.id,
            companyId: announcements_schema_1.announcementCategories.companyId,
        })
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .limit(1)
            .execute();
        if (!existing)
            throw new common_1.BadRequestException('Category not found');
        await this.db
            .delete(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'announcement_category',
            entityId: id,
            userId: user.id,
            details: `Deleted category ${id} for company ${existing.companyId}`,
        });
        await this.invalidateCategories(existing.companyId);
        return { success: true };
    }
    async listCategories(companyId) {
        return this.cache.getOrSetCache(this.categoriesKey(companyId), async () => {
            return this.db
                .select()
                .from(announcements_schema_1.announcementCategories)
                .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, companyId))
                .execute();
        });
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], CategoryService);
//# sourceMappingURL=category.service.js.map