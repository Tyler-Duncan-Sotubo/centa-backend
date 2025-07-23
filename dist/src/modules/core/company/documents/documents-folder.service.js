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
    async create(createDto, user) {
        const { id: userId, companyId } = user;
        const existing = await this.db
            .select()
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.name, createDto.name)));
        if (existing.length > 0) {
            throw new common_1.ConflictException('A folder with this name already exists.');
        }
        const [newFolder] = await this.db
            .insert(company_file_folders_schema_1.companyFileFolders)
            .values({
            name: createDto.name,
            companyId,
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
        if (folders.length === 0)
            return [];
        const folderIds = folders.map((f) => f.id);
        const files = await this.db
            .select()
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.companyId, companyId), (0, drizzle_orm_1.inArray)(company_files_schema_1.companyFiles.folderId, folderIds)));
        const filesByFolder = {};
        for (const file of files) {
            const folderId = file.folderId;
            if (!filesByFolder[folderId]) {
                filesByFolder[folderId] = [];
            }
            filesByFolder[folderId].push(file);
        }
        const roles = await this.db
            .select()
            .from(company_file_folder_roles_schema_1.companyFileFolderRoles)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, folderIds));
        const rolesByFolder = {};
        for (const { folderId, roleId } of roles) {
            if (!rolesByFolder[folderId])
                rolesByFolder[folderId] = [];
            rolesByFolder[folderId].push(roleId);
        }
        const departments = await this.db
            .select()
            .from(company_file_folder_departments_schema_1.companyFileFolderDepartments)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, folderIds));
        const departmentsByFolder = {};
        for (const { folderId, departmentId } of departments) {
            if (!departmentsByFolder[folderId])
                departmentsByFolder[folderId] = [];
            departmentsByFolder[folderId].push(departmentId);
        }
        const offices = await this.db
            .select()
            .from(company_file_folder_offices_schema_1.companyFileFolderOffices)
            .where((0, drizzle_orm_1.inArray)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, folderIds));
        const officesByFolder = {};
        for (const { folderId, officeId } of offices) {
            if (!officesByFolder[folderId])
                officesByFolder[folderId] = [];
            officesByFolder[folderId].push(officeId);
        }
        return folders.map((folder) => ({
            ...folder,
            files: filesByFolder[folder.id] ?? [],
            roleIds: rolesByFolder[folder.id] ?? [],
            departmentIds: departmentsByFolder[folder.id] ?? [],
            officeIds: officesByFolder[folder.id] ?? [],
        }));
    }
    async findOne(id) {
        const [folder] = await this.db
            .select()
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id));
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        return folder;
    }
    async update(id, dto, user) {
        const userId = user.id;
        const folder = await this.findOne(id);
        if (folder.isSystem) {
            throw new common_1.ForbiddenException('System folders cannot be updated.');
        }
        if (dto.name && dto.name !== folder.name) {
            const dup = await this.db
                .select()
                .from(company_file_folders_schema_1.companyFileFolders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, folder.companyId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.name, dto.name)));
            if (dup.length > 0) {
                throw new common_1.ConflictException('A folder with this name already exists.');
            }
        }
        const [updated] = await this.db
            .update(company_file_folders_schema_1.companyFileFolders)
            .set({ name: dto.name, permissionControlled: dto.permissionControlled })
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id))
            .returning();
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
        if (!updated) {
            throw new common_1.NotFoundException('Folder not found');
        }
        await this.audit.logAction({
            action: 'update',
            entityId: updated.id,
            entity: 'folder',
            userId,
            details: 'Folder updated',
            changes: {
                name: updated.name,
                permissionControlled: updated.permissionControlled,
            },
        });
        return updated;
    }
    async remove(id, userId) {
        const folder = await this.findOne(id);
        if (folder.isSystem) {
            throw new common_1.ForbiddenException('System folders cannot be deleted.');
        }
        const filesInFolder = await this.db
            .select({ id: company_files_schema_1.companyFiles.id })
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.folderId, id))
            .limit(1);
        if (filesInFolder.length > 0) {
            throw new common_1.BadRequestException('Cannot delete folder that contains files.');
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