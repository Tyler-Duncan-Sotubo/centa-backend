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
exports.DocumentsFolderService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const company_file_folders_schema_1 = require("./schema/company-file-folders.schema");
const audit_service_1 = require("../../../audit/audit.service");
const company_files_schema_1 = require("./schema/company-files.schema");
const company_file_folder_roles_schema_1 = require("./schema/company-file-folder-roles.schema");
const company_file_folder_departments_schema_1 = require("./schema/company-file-folder-departments.schema");
const company_file_folder_offices_schema_1 = require("./schema/company-file-folder-offices.schema");
let DocumentsFolderService = class DocumentsFolderService {
    constructor(db, audit) {
        this.db = db;
        this.audit = audit;
    }
    async getFolderOrThrow(id) {
        const [folder] = await this.db
            .select()
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id));
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        return folder;
    }
    async assertValidParentOrNull(companyId, folderId, parentId) {
        if (!parentId)
            return;
        if (parentId === folderId) {
            throw new common_1.BadRequestException('Folder cannot be its own parent.');
        }
        const [parent] = await this.db
            .select({ id: company_file_folders_schema_1.companyFileFolders.id })
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, parentId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId)))
            .limit(1);
        if (!parent) {
            throw new common_1.BadRequestException('Invalid parent folder.');
        }
    }
    async assertNoCycle(companyId, folderId, nextParentId) {
        let current = nextParentId;
        while (current) {
            if (current === folderId) {
                throw new common_1.BadRequestException('Cannot move folder into its own subtree.');
            }
            const [row] = await this.db
                .select({ parentId: company_file_folders_schema_1.companyFileFolders.parentId })
                .from(company_file_folders_schema_1.companyFileFolders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, current), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId)));
            if (!row)
                break;
            current = row.parentId ?? null;
        }
    }
    async assertUniqueNameInParent(companyId, name, parentId, ignoreId) {
        const dup = await this.db
            .select({ id: company_file_folders_schema_1.companyFileFolders.id })
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.name, name), parentId
            ? (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.parentId, parentId)
            : (0, drizzle_orm_1.isNull)(company_file_folders_schema_1.companyFileFolders.parentId)));
        if (dup.some((d) => d.id !== ignoreId)) {
            throw new common_1.ConflictException('A folder with this name already exists.');
        }
    }
    async create(createDto, user) {
        const { id: userId, companyId } = user;
        const parentId = createDto.parentId;
        if (parentId === undefined) {
            throw new common_1.BadRequestException('ParentId must be provided, use null for root folders.');
        }
        await this.assertValidParentOrNull(companyId, null, parentId);
        await this.assertUniqueNameInParent(companyId, createDto.name, parentId);
        const [newFolder] = await this.db
            .insert(company_file_folders_schema_1.companyFileFolders)
            .values({
            name: createDto.name,
            companyId,
            parentId,
            createdBy: userId,
            permissionControlled: createDto.permissionControlled ?? false,
            isSystem: false,
        })
            .returning();
        const folderId = newFolder.id;
        if (createDto.permissionControlled) {
            if (createDto.roleIds?.length) {
                await this.db.insert(company_file_folder_roles_schema_1.companyFileFolderRoles).values(createDto.roleIds.map((roleId) => ({
                    folderId,
                    roleId,
                })));
            }
            if (createDto.departmentIds?.length) {
                await this.db.insert(company_file_folder_departments_schema_1.companyFileFolderDepartments).values(createDto.departmentIds.map((departmentId) => ({
                    folderId,
                    departmentId,
                })));
            }
            if (createDto.officeIds?.length) {
                await this.db.insert(company_file_folder_offices_schema_1.companyFileFolderOffices).values(createDto.officeIds.map((officeId) => ({
                    folderId,
                    officeId,
                })));
            }
        }
        await this.audit.logAction({
            action: 'create',
            entityId: newFolder.id,
            entity: 'folder',
            userId,
            details: 'Folder created',
            changes: {
                name: newFolder.name,
                companyId: newFolder.companyId,
                parentId: newFolder.parentId ?? null,
                permissionControlled: newFolder.permissionControlled,
            },
        });
        return newFolder;
    }
    async findAll(companyId) {
        const folders = await this.db
            .select()
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId));
        if (!folders.length)
            return [];
        const folderIds = folders.map((f) => f.id);
        const files = await this.db
            .select()
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.companyId, companyId), (0, drizzle_orm_1.inArray)(company_files_schema_1.companyFiles.folderId, folderIds)));
        const filesByFolder = {};
        for (const file of files) {
            const folderId = file.folderId;
            (filesByFolder[folderId] ??= []).push(file);
        }
        const roles = await this.db
            .select()
            .from(company_file_folder_roles_schema_1.companyFileFolderRoles)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, folderIds));
        const rolesByFolder = {};
        for (const { folderId, roleId } of roles) {
            (rolesByFolder[folderId] ??= []).push(roleId);
        }
        const departments = await this.db
            .select()
            .from(company_file_folder_departments_schema_1.companyFileFolderDepartments)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, folderIds));
        const departmentsByFolder = {};
        for (const { folderId, departmentId } of departments) {
            (departmentsByFolder[folderId] ??= []).push(departmentId);
        }
        const offices = await this.db
            .select()
            .from(company_file_folder_offices_schema_1.companyFileFolderOffices)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, folderIds));
        const officesByFolder = {};
        for (const { folderId, officeId } of offices) {
            (officesByFolder[folderId] ??= []).push(officeId);
        }
        const enriched = folders.map((folder) => ({
            ...folder,
            files: filesByFolder[folder.id] ?? [],
            roleIds: rolesByFolder[folder.id] ?? [],
            departmentIds: departmentsByFolder[folder.id] ?? [],
            officeIds: officesByFolder[folder.id] ?? [],
            children: [],
        }));
        const map = new Map();
        enriched.forEach((f) => map.set(f.id, f));
        const roots = [];
        enriched.forEach((f) => {
            if (f.parentId)
                map.get(f.parentId)?.children.push(f);
            else
                roots.push(f);
        });
        return roots;
    }
    async findOne(id) {
        return this.getFolderOrThrow(id);
    }
    async update(id, dto, user) {
        const userId = user.id;
        const folder = await this.getFolderOrThrow(id);
        if (folder.isSystem) {
            throw new common_1.ForbiddenException('System folders cannot be updated.');
        }
        const nextParentId = dto.parentId === undefined
            ? (folder.parentId ?? null)
            : (dto.parentId ?? null);
        const nextName = dto.name ?? folder.name;
        await this.assertValidParentOrNull(folder.companyId, id, nextParentId);
        await this.assertNoCycle(folder.companyId, id, nextParentId);
        await this.assertUniqueNameInParent(folder.companyId, nextName, nextParentId, id);
        const [updated] = await this.db
            .update(company_file_folders_schema_1.companyFileFolders)
            .set({
            name: dto.name,
            parentId: dto.parentId,
            permissionControlled: dto.permissionControlled,
        })
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id))
            .returning();
        if (!updated)
            throw new common_1.NotFoundException('Folder not found');
        await Promise.all([
            this.db
                .delete(company_file_folder_roles_schema_1.companyFileFolderRoles)
                .where((0, drizzle_orm_1.eq)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, id)),
            this.db
                .delete(company_file_folder_departments_schema_1.companyFileFolderDepartments)
                .where((0, drizzle_orm_1.eq)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, id)),
            this.db
                .delete(company_file_folder_offices_schema_1.companyFileFolderOffices)
                .where((0, drizzle_orm_1.eq)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, id)),
        ]);
        if (dto.permissionControlled) {
            if (dto.roleIds?.length) {
                await this.db
                    .insert(company_file_folder_roles_schema_1.companyFileFolderRoles)
                    .values(dto.roleIds.map((roleId) => ({ folderId: id, roleId })));
            }
            if (dto.departmentIds?.length) {
                await this.db.insert(company_file_folder_departments_schema_1.companyFileFolderDepartments).values(dto.departmentIds.map((departmentId) => ({
                    folderId: id,
                    departmentId,
                })));
            }
            if (dto.officeIds?.length) {
                await this.db
                    .insert(company_file_folder_offices_schema_1.companyFileFolderOffices)
                    .values(dto.officeIds.map((officeId) => ({ folderId: id, officeId })));
            }
        }
        await this.audit.logAction({
            action: 'update',
            entityId: updated.id,
            entity: 'folder',
            userId,
            details: 'Folder updated',
            changes: {
                name: updated.name,
                parentId: updated.parentId ?? null,
                permissionControlled: updated.permissionControlled,
            },
        });
        return updated;
    }
    async remove(id, userId) {
        const folder = await this.getFolderOrThrow(id);
        if (folder.isSystem) {
            throw new common_1.ForbiddenException('System folders cannot be deleted.');
        }
        const filesInFolder = await this.db
            .select({ id: company_files_schema_1.companyFiles.id })
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.folderId, id))
            .limit(1);
        if (filesInFolder.length) {
            throw new common_1.BadRequestException('Cannot delete folder that contains files.');
        }
        const child = await this.db
            .select({ id: company_file_folders_schema_1.companyFileFolders.id })
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.parentId, id))
            .limit(1);
        if (child.length) {
            throw new common_1.BadRequestException('Cannot delete folder that contains subfolders.');
        }
        await this.db
            .delete(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id));
        await Promise.all([
            this.db
                .delete(company_file_folder_roles_schema_1.companyFileFolderRoles)
                .where((0, drizzle_orm_1.eq)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, id)),
            this.db
                .delete(company_file_folder_departments_schema_1.companyFileFolderDepartments)
                .where((0, drizzle_orm_1.eq)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, id)),
            this.db
                .delete(company_file_folder_offices_schema_1.companyFileFolderOffices)
                .where((0, drizzle_orm_1.eq)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, id)),
        ]);
        await this.audit.logAction({
            action: 'delete',
            entityId: id,
            entity: 'folder',
            userId,
            details: 'Folder deleted',
        });
        return { success: true };
    }
};
exports.DocumentsFolderService = DocumentsFolderService;
exports.DocumentsFolderService = DocumentsFolderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], DocumentsFolderService);
//# sourceMappingURL=documents-folder.service.js.map