import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { companyFileFolders } from './schema/company-file-folders.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { companyFiles } from './schema/company-files.schema';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';
import { companyFileFolderRoles } from './schema/company-file-folder-roles.schema';
import { companyFileFolderDepartments } from './schema/company-file-folder-departments.schema';
import { companyFileFolderOffices } from './schema/company-file-folder-offices.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class DocumentsFolderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(DocumentsFolderService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `doc:folders:${companyId}:list`;
  }
  private oneKey(id: string) {
    return `doc:folder:${id}`;
  }
  private async burst(opts: { companyId?: string; id?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) jobs.push(this.cache.del(this.listKey(opts.companyId)));
    if (opts.id) jobs.push(this.cache.del(this.oneKey(opts.id)));
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'folders:cache:burst');
  }

  // ---------- helpers ----------
  private async upsertPermissions(
    folderId: string,
    dto: { roleIds?: string[]; departmentIds?: string[]; officeIds?: string[] },
  ) {
    // clear
    await Promise.all([
      this.db
        .delete(companyFileFolderRoles)
        .where(eq(companyFileFolderRoles.folderId, folderId)),
      this.db
        .delete(companyFileFolderDepartments)
        .where(eq(companyFileFolderDepartments.folderId, folderId)),
      this.db
        .delete(companyFileFolderOffices)
        .where(eq(companyFileFolderOffices.folderId, folderId)),
    ]);

    // re-insert
    const jobs: Promise<any>[] = [];
    if (dto.roleIds?.length) {
      jobs.push(
        this.db
          .insert(companyFileFolderRoles)
          .values(dto.roleIds.map((roleId) => ({ folderId, roleId }))),
      );
    }
    if (dto.departmentIds?.length) {
      jobs.push(
        this.db.insert(companyFileFolderDepartments).values(
          dto.departmentIds.map((departmentId) => ({
            folderId,
            departmentId,
          })),
        ),
      );
    }
    if (dto.officeIds?.length) {
      jobs.push(
        this.db
          .insert(companyFileFolderOffices)
          .values(dto.officeIds.map((officeId) => ({ folderId, officeId }))),
      );
    }
    if (jobs.length) await Promise.all(jobs);
  }

  // ---------- mutations ----------
  async create(createDto: CreateDocumentFoldersDto, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ companyId, createDto }, 'folders:create:start');

    const existing = await this.db
      .select()
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, createDto.name),
        ),
      );

    if (existing.length > 0) {
      this.logger.warn(
        { companyId, name: createDto.name },
        'folders:create:duplicate',
      );
      throw new ConflictException('A folder with this name already exists.');
    }

    const [newFolder] = await this.db
      .insert(companyFileFolders)
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

  async update(id: string, dto: UpdateDocumentFoldersDto, user: User) {
    this.logger.info({ id, userId: user.id, dto }, 'folders:update:start');

    const folder = await this.findOne(id); // cached
    if (folder.isSystem) {
      this.logger.warn({ id }, 'folders:update:is-system');
      throw new ForbiddenException('System folders cannot be updated.');
    }

    // prevent duplicate name within company
    if (dto.name && dto.name !== folder.name) {
      const dup = await this.db
        .select()
        .from(companyFileFolders)
        .where(
          and(
            eq(companyFileFolders.companyId, folder.companyId),
            eq(companyFileFolders.name, dto.name),
          ),
        );
      if (dup.length > 0) {
        this.logger.warn(
          { id, name: dto.name },
          'folders:update:duplicate-name',
        );
        throw new ConflictException('A folder with this name already exists.');
      }
    }

    const [updated] = await this.db
      .update(companyFileFolders)
      .set({
        name: dto.name ?? folder.name,
        permissionControlled:
          dto.permissionControlled ?? folder.permissionControlled,
      })
      .where(eq(companyFileFolders.id, id))
      .returning();

    // permissions
    if (dto.permissionControlled) {
      await this.upsertPermissions(id, dto);
    } else {
      // if permissions toggled off, ensure everything is cleared
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

  async remove(id: string, userId: string) {
    this.logger.info({ id, userId }, 'folders:remove:start');

    const folder = await this.findOne(id); // cached
    if (folder.isSystem) {
      this.logger.warn({ id }, 'folders:remove:is-system');
      throw new ForbiddenException('System folders cannot be deleted.');
    }

    const filesInFolder = await this.db
      .select({ id: companyFiles.id })
      .from(companyFiles)
      .where(eq(companyFiles.folderId, id))
      .limit(1);

    if (filesInFolder.length > 0) {
      this.logger.warn({ id }, 'folders:remove:has-files');
      throw new BadRequestException(
        'Cannot delete folder that contains files.',
      );
    }

    await this.db
      .delete(companyFileFolders)
      .where(eq(companyFileFolders.id, id));

    // Clear permissions
    await Promise.all([
      this.db
        .delete(companyFileFolderRoles)
        .where(eq(companyFileFolderRoles.folderId, id)),
      this.db
        .delete(companyFileFolderDepartments)
        .where(eq(companyFileFolderDepartments.folderId, id)),
      this.db
        .delete(companyFileFolderOffices)
        .where(eq(companyFileFolderOffices.folderId, id)),
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

  // ---------- queries ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'folders:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      // folders
      const folders = await this.db
        .select()
        .from(companyFileFolders)
        .where(eq(companyFileFolders.companyId, companyId));

      if (folders.length === 0) return [];

      const folderIds = folders.map((f) => f.id);

      // files
      const files = await this.db
        .select()
        .from(companyFiles)
        .where(
          and(
            eq(companyFiles.companyId, companyId),
            inArray(companyFiles.folderId, folderIds),
          ),
        );

      const filesByFolder: Record<
        string,
        (typeof companyFiles.$inferSelect)[]
      > = {};
      for (const file of files) {
        const fid = file.folderId!;
        (filesByFolder[fid] ||= []).push(file);
      }

      // roles
      const roles = await this.db
        .select()
        .from(companyFileFolderRoles)
        .where(inArray(companyFileFolderRoles.folderId, folderIds));

      const rolesByFolder: Record<string, string[]> = {};
      for (const { folderId, roleId } of roles)
        (rolesByFolder[folderId] ||= []).push(roleId);

      // departments
      const departments = await this.db
        .select()
        .from(companyFileFolderDepartments)
        .where(inArray(companyFileFolderDepartments.folderId, folderIds));

      const departmentsByFolder: Record<string, string[]> = {};
      for (const { folderId, departmentId } of departments)
        (departmentsByFolder[folderId] ||= []).push(departmentId);

      // offices
      const offices = await this.db
        .select()
        .from(companyFileFolderOffices)
        .where(inArray(companyFileFolderOffices.folderId, folderIds));

      const officesByFolder: Record<string, string[]> = {};
      for (const { folderId, officeId } of offices)
        (officesByFolder[folderId] ||= []).push(officeId);

      const result = folders.map((folder) => ({
        ...folder,
        files: filesByFolder[folder.id] ?? [],
        roleIds: rolesByFolder[folder.id] ?? [],
        departmentIds: departmentsByFolder[folder.id] ?? [],
        officeIds: officesByFolder[folder.id] ?? [],
      }));

      this.logger.debug(
        { companyId, count: result.length },
        'folders:findAll:db:done',
      );
      return result;
    });
  }

  async findOne(id: string) {
    const key = this.oneKey(id);
    this.logger.debug({ id, key }, 'folders:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [folder] = await this.db
        .select()
        .from(companyFileFolders)
        .where(eq(companyFileFolders.id, id));

      if (!folder) {
        this.logger.warn({ id }, 'folders:findOne:not-found');
        throw new NotFoundException('Folder not found');
      }

      this.logger.debug({ id }, 'folders:findOne:db:done');
      return folder;
    });
  }
}
