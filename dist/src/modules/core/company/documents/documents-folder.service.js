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
var DocumentsFolderService_1;
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
const nestjs_pino_1 = require("nestjs-pino");
const cache_service_1 = require("../../../../common/cache/cache.service");
let DocumentsFolderService = DocumentsFolderService_1 = class DocumentsFolderService {
    constructor(db, audit, logger, cache) {
        this.db = db;
        this.audit = audit;
        this.logger = logger;
        this.cache = cache;
        this.logger.setContext(DocumentsFolderService_1.name);
    }
    listKey(companyId) {
        return `doc:folders:${companyId}:list`;
    }
    oneKey(id) {
        return `doc:folder:${id}`;
    }
    async burst(opts) {
        const jobs = [];
        if (opts.companyId)
            jobs.push(this.cache.del(this.listKey(opts.companyId)));
        if (opts.id)
            jobs.push(this.cache.del(this.oneKey(opts.id)));
        await Promise.allSettled(jobs);
        this.logger.debug(opts, 'folders:cache:burst');
    }
    async upsertPermissions(folderId, dto) {
        await Promise.all([
            this.db
                .delete(company_file_folder_roles_schema_1.companyFileFolderRoles)
                .where((0, drizzle_orm_1.eq)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, folderId)),
            this.db
                .delete(company_file_folder_departments_schema_1.companyFileFolderDepartments)
                .where((0, drizzle_orm_1.eq)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, folderId)),
            this.db
                .delete(company_file_folder_offices_schema_1.companyFileFolderOffices)
                .where((0, drizzle_orm_1.eq)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, folderId)),
        ]);
        const jobs = [];
        if (dto.roleIds?.length) {
            jobs.push(this.db
                .insert(company_file_folder_roles_schema_1.companyFileFolderRoles)
                .values(dto.roleIds.map((roleId) => ({ folderId, roleId }))));
        }
        if (dto.departmentIds?.length) {
            jobs.push(this.db.insert(company_file_folder_departments_schema_1.companyFileFolderDepartments).values(dto.departmentIds.map((departmentId) => ({
                folderId,
                departmentId,
            }))));
        }
        if (dto.officeIds?.length) {
            jobs.push(this.db
                .insert(company_file_folder_offices_schema_1.companyFileFolderOffices)
                .values(dto.officeIds.map((officeId) => ({ folderId, officeId }))));
        }
        if (jobs.length)
            await Promise.all(jobs);
    }
    async create(createDto, user) {
        const { id: userId, companyId } = user;
        this.logger.info({ companyId, createDto }, 'folders:create:start');
        const existing = await this.db
            .select()
            .from(company_file_folders_schema_1.companyFileFolders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, companyId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.name, createDto.name)));
        if (existing.length > 0) {
            this.logger.warn({ companyId, name: createDto.name }, 'folders:create:duplicate');
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
        if (createDto.permissionControlled) {
            await this.upsertPermissions(newFolder.id, createDto);
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
        await this.burst({ companyId, id: newFolder.id });
        this.logger.info({ id: newFolder.id }, 'folders:create:done');
        return newFolder;
    }
    async update(id, dto, user) {
        this.logger.info({ id, userId: user.id, dto }, 'folders:update:start');
        const folder = await this.findOne(id);
        if (folder.isSystem) {
            this.logger.warn({ id }, 'folders:update:is-system');
            throw new common_1.ForbiddenException('System folders cannot be updated.');
        }
        if (dto.name && dto.name !== folder.name) {
            const dup = await this.db
                .select()
                .from(company_file_folders_schema_1.companyFileFolders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.companyId, folder.companyId), (0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.name, dto.name)));
            if (dup.length > 0) {
                this.logger.warn({ id, name: dto.name }, 'folders:update:duplicate-name');
                throw new common_1.ConflictException('A folder with this name already exists.');
            }
        }
        const [updated] = await this.db
            .update(company_file_folders_schema_1.companyFileFolders)
            .set({
            name: dto.name ?? folder.name,
            permissionControlled: dto.permissionControlled ?? folder.permissionControlled,
        })
            .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id))
            .returning();
        if (dto.permissionControlled) {
            await this.upsertPermissions(id, dto);
        }
        else {
            await this.upsertPermissions(id, {
                roleIds: [],
                departmentIds: [],
                officeIds: [],
            });
        }
        await this.audit.logAction({
            action: 'update',
            entityId: updated.id,
            entity: 'folder',
            userId: user.id,
            details: 'Folder updated',
            changes: {
                name: updated.name,
                permissionControlled: updated.permissionControlled,
            },
        });
        await this.burst({ companyId: updated.companyId, id });
        this.logger.info({ id }, 'folders:update:done');
        return updated;
    }
    async remove(id, userId) {
        this.logger.info({ id, userId }, 'folders:remove:start');
        const folder = await this.findOne(id);
        if (folder.isSystem) {
            this.logger.warn({ id }, 'folders:remove:is-system');
            throw new common_1.ForbiddenException('System folders cannot be deleted.');
        }
        const filesInFolder = await this.db
            .select({ id: company_files_schema_1.companyFiles.id })
            .from(company_files_schema_1.companyFiles)
            .where((0, drizzle_orm_1.eq)(company_files_schema_1.companyFiles.folderId, id))
            .limit(1);
        if (filesInFolder.length > 0) {
            this.logger.warn({ id }, 'folders:remove:has-files');
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
        await this.burst({ companyId: folder.companyId, id });
        this.logger.info({ id }, 'folders:remove:done');
        return { success: true };
    }
    async findAll(companyId) {
        const key = this.listKey(companyId);
        this.logger.debug({ companyId, key }, 'folders:findAll:cache:get');
        return this.cache.getOrSetCache(key, async () => {
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
                const fid = file.folderId;
                (filesByFolder[fid] ||= []).push(file);
            }
            const roles = await this.db
                .select()
                .from(company_file_folder_roles_schema_1.companyFileFolderRoles)
                .where((0, drizzle_orm_1.inArray)(company_file_folder_roles_schema_1.companyFileFolderRoles.folderId, folderIds));
            const rolesByFolder = {};
            for (const { folderId, roleId } of roles)
                (rolesByFolder[folderId] ||= []).push(roleId);
            const departments = await this.db
                .select()
                .from(company_file_folder_departments_schema_1.companyFileFolderDepartments)
                .where((0, drizzle_orm_1.inArray)(company_file_folder_departments_schema_1.companyFileFolderDepartments.folderId, folderIds));
            const departmentsByFolder = {};
            for (const { folderId, departmentId } of departments)
                (departmentsByFolder[folderId] ||= []).push(departmentId);
            const offices = await this.db
                .select()
                .from(company_file_folder_offices_schema_1.companyFileFolderOffices)
                .where((0, drizzle_orm_1.inArray)(company_file_folder_offices_schema_1.companyFileFolderOffices.folderId, folderIds));
            const officesByFolder = {};
            for (const { folderId, officeId } of offices)
                (officesByFolder[folderId] ||= []).push(officeId);
            const result = folders.map((folder) => ({
                ...folder,
                files: filesByFolder[folder.id] ?? [],
                roleIds: rolesByFolder[folder.id] ?? [],
                departmentIds: departmentsByFolder[folder.id] ?? [],
                officeIds: officesByFolder[folder.id] ?? [],
            }));
            this.logger.debug({ companyId, count: result.length }, 'folders:findAll:db:done');
            return result;
        });
    }
    async findOne(id) {
        const key = this.oneKey(id);
        this.logger.debug({ id, key }, 'folders:findOne:cache:get');
        return this.cache.getOrSetCache(key, async () => {
            const [folder] = await this.db
                .select()
                .from(company_file_folders_schema_1.companyFileFolders)
                .where((0, drizzle_orm_1.eq)(company_file_folders_schema_1.companyFileFolders.id, id));
            if (!folder) {
                this.logger.warn({ id }, 'folders:findOne:not-found');
                throw new common_1.NotFoundException('Folder not found');
            }
            this.logger.debug({ id }, 'folders:findOne:db:done');
            return folder;
        });
    }
};
exports.DocumentsFolderService = DocumentsFolderService;
exports.DocumentsFolderService = DocumentsFolderService = DocumentsFolderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        nestjs_pino_1.PinoLogger,
        cache_service_1.CacheService])
], DocumentsFolderService);
//# sourceMappingURL=documents-folder.service.js.map