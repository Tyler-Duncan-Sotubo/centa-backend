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
let CategoryService = class CategoryService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async createCategory(name, user) {
        const [existing] = await this.db
            .select()
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.name, name), (0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, user.companyId)))
            .execute();
        if (existing) {
            throw new common_1.BadRequestException('Category code already exists');
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
        return newCategory;
    }
    async updateCategory(id, name, user) {
        const [existing] = await this.db
            .select()
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .execute();
        if (!existing) {
            throw new common_1.BadRequestException('Category not found');
        }
        const [updated] = await this.db
            .update(announcements_schema_1.announcementCategories)
            .set({
            name,
        })
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'update',
            entity: 'announcement_category',
            entityId: updated.id,
            userId: user.id,
            details: `Updated category ${id} to ${name} for company ${user.companyId}`,
            changes: {
                name: updated.name,
                companyId: updated.companyId,
            },
        });
        return updated;
    }
    async deleteCategory(id, user) {
        const [existing] = await this.db
            .select()
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .execute();
        if (!existing) {
            throw new common_1.BadRequestException('Category not found');
        }
        await this.db
            .delete(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.id, id))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'announcement_category',
            entityId: id,
            userId: user.id,
            details: `Deleted category ${id} for company ${user.companyId}`,
        });
        return { success: true };
    }
    async listCategories(companyId) {
        return await this.db
            .select()
            .from(announcements_schema_1.announcementCategories)
            .where((0, drizzle_orm_1.eq)(announcements_schema_1.announcementCategories.companyId, companyId))
            .execute();
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], CategoryService);
//# sourceMappingURL=category.service.js.map