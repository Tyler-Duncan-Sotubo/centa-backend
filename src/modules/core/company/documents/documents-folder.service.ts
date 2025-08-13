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

@Injectable()
export class DocumentsFolderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
  ) {}

  async create(createDto: CreateDocumentFoldersDto, user: User) {
    const { id: userId, companyId } = user;
    // 1. Check for duplicates in the same company
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

    const folderId = newFolder.id;

    if (createDto.permissionControlled) {
      // Roles
      if (createDto.roleIds?.length) {
        await this.db.insert(companyFileFolderRoles).values(
          createDto.roleIds.map((roleId) => ({
            folderId,
            roleId,
          })),
        );
      }

      // Departments
      if (createDto.departmentIds?.length) {
        await this.db.insert(companyFileFolderDepartments).values(
          createDto.departmentIds.map((departmentId) => ({
            folderId,
            departmentId,
          })),
        );
      }

      // Offices
      if (createDto.officeIds?.length) {
        await this.db.insert(companyFileFolderOffices).values(
          createDto.officeIds.map((officeId) => ({
            folderId,
            officeId,
          })),
        );
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

  async findAll(companyId: string) {
    // 1. Get all folders for the company
    const folders = await this.db
      .select()
      .from(companyFileFolders)
      .where(eq(companyFileFolders.companyId, companyId));

    if (folders.length === 0) return [];

    const folderIds = folders.map((f) => f.id);

    // 2. Get all files for these folders
    const files = await this.db
      .select()
      .from(companyFiles)
      .where(
        and(
          eq(companyFiles.companyId, companyId),
          inArray(companyFiles.folderId, folderIds),
        ),
      );

    // 3. Group files by folderId
    const filesByFolder: Record<string, (typeof companyFiles.$inferSelect)[]> =
      {};
    for (const file of files) {
      const folderId = file.folderId!;
      if (!filesByFolder[folderId]) {
        filesByFolder[folderId] = [];
      }
      filesByFolder[folderId].push(file);
    }

    // 4. Get associated roleIds
    const roles = await this.db
      .select()
      .from(companyFileFolderRoles)
      .where(inArray(companyFileFolderRoles.folderId, folderIds));

    const rolesByFolder: Record<string, string[]> = {};
    for (const { folderId, roleId } of roles) {
      if (!rolesByFolder[folderId]) rolesByFolder[folderId] = [];
      rolesByFolder[folderId].push(roleId);
    }

    // 5. Get associated departmentIds
    const departments = await this.db
      .select()
      .from(companyFileFolderDepartments)
      .where(inArray(companyFileFolderDepartments.folderId, folderIds));

    const departmentsByFolder: Record<string, string[]> = {};
    for (const { folderId, departmentId } of departments) {
      if (!departmentsByFolder[folderId]) departmentsByFolder[folderId] = [];
      departmentsByFolder[folderId].push(departmentId);
    }

    // 6. Get associated officeIds
    const offices = await this.db
      .select()
      .from(companyFileFolderOffices)
      .where(inArray(companyFileFolderOffices.folderId, folderIds));

    const officesByFolder: Record<string, string[]> = {};
    for (const { folderId, officeId } of offices) {
      if (!officesByFolder[folderId]) officesByFolder[folderId] = [];
      officesByFolder[folderId].push(officeId);
    }

    // 7. Merge all data into folders
    return folders.map((folder) => ({
      ...folder,
      files: filesByFolder[folder.id] ?? [],
      roleIds: rolesByFolder[folder.id] ?? [],
      departmentIds: departmentsByFolder[folder.id] ?? [],
      officeIds: officesByFolder[folder.id] ?? [],
    }));
  }

  async findOne(id: string) {
    const [folder] = await this.db
      .select()
      .from(companyFileFolders)
      .where(eq(companyFileFolders.id, id));

    if (!folder) throw new NotFoundException('Folder not found');

    return folder;
  }

  async update(id: string, dto: UpdateDocumentFoldersDto, user: User) {
    const userId = user.id;
    const folder = await this.findOne(id);

    if (folder.isSystem) {
      throw new ForbiddenException('System folders cannot be updated.');
    }

    // Optional: prevent renaming to a duplicate
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
        throw new ConflictException('A folder with this name already exists.');
      }
    }

    const [updated] = await this.db
      .update(companyFileFolders)
      .set({ name: dto.name, permissionControlled: dto.permissionControlled })
      .where(eq(companyFileFolders.id, id))
      .returning();

    // clear existing permissions
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

    // re-insert updated values (same logic as in create)
    if (dto.permissionControlled) {
      if (dto.roleIds?.length) {
        await this.db
          .insert(companyFileFolderRoles)
          .values(dto.roleIds.map((roleId) => ({ folderId: id, roleId })));
      }

      if (dto.departmentIds?.length) {
        await this.db.insert(companyFileFolderDepartments).values(
          dto.departmentIds.map((departmentId) => ({
            folderId: id,
            departmentId,
          })),
        );
      }

      if (dto.officeIds?.length) {
        await this.db
          .insert(companyFileFolderOffices)
          .values(
            dto.officeIds.map((officeId) => ({ folderId: id, officeId })),
          );
      }
    }

    if (!updated) {
      throw new NotFoundException('Folder not found');
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

  async remove(id: string, userId: string) {
    const folder = await this.findOne(id);

    if (folder.isSystem) {
      throw new ForbiddenException('System folders cannot be deleted.');
    }

    const filesInFolder = await this.db
      .select({ id: companyFiles.id })
      .from(companyFiles)
      .where(eq(companyFiles.folderId, id))
      .limit(1);

    if (filesInFolder.length > 0) {
      throw new BadRequestException(
        'Cannot delete folder that contains files.',
      );
    }

    // ✅ Safe to delete
    await this.db
      .delete(companyFileFolders)
      .where(eq(companyFileFolders.id, id));

    // clear existing permissions
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

    return { success: true };
  }
}
