import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray, isNull } from 'drizzle-orm';
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

type Folder = typeof companyFileFolders.$inferSelect;
type File = typeof companyFiles.$inferSelect;

type EnrichedFolder = Folder & {
  files: File[];
  roleIds: string[];
  departmentIds: string[];
  officeIds: string[];
  children: EnrichedFolder[];
};

@Injectable()
export class DocumentsFolderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly audit: AuditService,
  ) {}

  private async getFolderOrThrow(id: string) {
    const [folder] = await this.db
      .select()
      .from(companyFileFolders)
      .where(eq(companyFileFolders.id, id));

    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  private async assertValidParentOrNull(
    companyId: string,
    folderId: string | null,
    parentId: string | null,
  ) {
    if (!parentId) return;
    if (parentId === folderId) {
      throw new BadRequestException('Folder cannot be its own parent.');
    }

    const [parent] = await this.db
      .select({ id: companyFileFolders.id })
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.id, parentId),
          eq(companyFileFolders.companyId, companyId),
        ),
      )
      .limit(1);

    if (!parent) {
      throw new BadRequestException('Invalid parent folder.');
    }
  }

  private async assertNoCycle(
    companyId: string,
    folderId: string,
    nextParentId: string | null,
  ) {
    // walk up parents from nextParentId; if we hit folderId => cycle
    let current = nextParentId;
    while (current) {
      if (current === folderId) {
        throw new BadRequestException(
          'Cannot move folder into its own subtree.',
        );
      }
      const [row] = await this.db
        .select({ parentId: companyFileFolders.parentId })
        .from(companyFileFolders)
        .where(
          and(
            eq(companyFileFolders.id, current),
            eq(companyFileFolders.companyId, companyId),
          ),
        );

      if (!row) break;
      current = row.parentId ?? null;
    }
  }

  private async assertUniqueNameInParent(
    companyId: string,
    name: string,
    parentId: string | null,
    ignoreId?: string,
  ) {
    const dup = await this.db
      .select({ id: companyFileFolders.id })
      .from(companyFileFolders)
      .where(
        and(
          eq(companyFileFolders.companyId, companyId),
          eq(companyFileFolders.name, name),
          parentId
            ? eq(companyFileFolders.parentId, parentId)
            : isNull(companyFileFolders.parentId),
        ),
      );

    if (dup.some((d) => d.id !== ignoreId)) {
      throw new ConflictException('A folder with this name already exists.');
    }
  }

  async create(createDto: CreateDocumentFoldersDto, user: User) {
    const { id: userId, companyId } = user;
    const parentId = createDto.parentId;

    if (parentId === undefined) {
      throw new BadRequestException(
        'ParentId must be provided, use null for root folders.',
      );
    }

    await this.assertValidParentOrNull(companyId, null, parentId);
    await this.assertUniqueNameInParent(companyId, createDto.name, parentId);

    const [newFolder] = await this.db
      .insert(companyFileFolders)
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
        await this.db.insert(companyFileFolderRoles).values(
          createDto.roleIds.map((roleId) => ({
            folderId,
            roleId,
          })),
        );
      }

      if (createDto.departmentIds?.length) {
        await this.db.insert(companyFileFolderDepartments).values(
          createDto.departmentIds.map((departmentId) => ({
            folderId,
            departmentId,
          })),
        );
      }

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
        parentId: newFolder.parentId ?? null,
        permissionControlled: newFolder.permissionControlled,
      },
    });

    return newFolder;
  }

  async findAll(companyId: string) {
    const folders = await this.db
      .select()
      .from(companyFileFolders)
      .where(eq(companyFileFolders.companyId, companyId));

    if (!folders.length) return [];

    const folderIds = folders.map((f) => f.id);

    const files = await this.db
      .select()
      .from(companyFiles)
      .where(
        and(
          eq(companyFiles.companyId, companyId),
          inArray(companyFiles.folderId, folderIds),
        ),
      );

    const filesByFolder: Record<string, (typeof companyFiles.$inferSelect)[]> =
      {};
    for (const file of files) {
      const folderId = file.folderId!;
      (filesByFolder[folderId] ??= []).push(file);
    }

    const roles = await this.db
      .select()
      .from(companyFileFolderRoles)
      .where(inArray(companyFileFolderRoles.folderId, folderIds));

    const rolesByFolder: Record<string, string[]> = {};
    for (const { folderId, roleId } of roles) {
      (rolesByFolder[folderId] ??= []).push(roleId);
    }

    const departments = await this.db
      .select()
      .from(companyFileFolderDepartments)
      .where(inArray(companyFileFolderDepartments.folderId, folderIds));

    const departmentsByFolder: Record<string, string[]> = {};
    for (const { folderId, departmentId } of departments) {
      (departmentsByFolder[folderId] ??= []).push(departmentId);
    }

    const offices = await this.db
      .select()
      .from(companyFileFolderOffices)
      .where(inArray(companyFileFolderOffices.folderId, folderIds));

    const officesByFolder: Record<string, string[]> = {};
    for (const { folderId, officeId } of offices) {
      (officesByFolder[folderId] ??= []).push(officeId);
    }

    const enriched: EnrichedFolder[] = folders.map((folder) => ({
      ...folder,
      files: filesByFolder[folder.id] ?? [],
      roleIds: rolesByFolder[folder.id] ?? [],
      departmentIds: departmentsByFolder[folder.id] ?? [],
      officeIds: officesByFolder[folder.id] ?? [],
      children: [] as any[],
    }));

    const map = new Map<string, any>();
    enriched.forEach((f) => map.set(f.id, f));

    const roots: any[] = [];
    enriched.forEach((f) => {
      if (f.parentId) map.get(f.parentId)?.children.push(f);
      else roots.push(f);
    });

    return roots;
  }

  async findOne(id: string) {
    return this.getFolderOrThrow(id);
  }

  async update(id: string, dto: UpdateDocumentFoldersDto, user: User) {
    const userId = user.id;
    const folder = await this.getFolderOrThrow(id);

    if (folder.isSystem) {
      throw new ForbiddenException('System folders cannot be updated.');
    }

    const nextParentId =
      dto.parentId === undefined
        ? (folder.parentId ?? null)
        : (dto.parentId ?? null);
    const nextName = dto.name ?? folder.name;

    await this.assertValidParentOrNull(folder.companyId, id, nextParentId);
    await this.assertNoCycle(folder.companyId, id, nextParentId);
    await this.assertUniqueNameInParent(
      folder.companyId,
      nextName,
      nextParentId,
      id,
    );

    const [updated] = await this.db
      .update(companyFileFolders)
      .set({
        name: dto.name,
        parentId: dto.parentId,
        permissionControlled: dto.permissionControlled,
      })
      .where(eq(companyFileFolders.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Folder not found');

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

  async remove(id: string, userId: string) {
    const folder = await this.getFolderOrThrow(id);

    if (folder.isSystem) {
      throw new ForbiddenException('System folders cannot be deleted.');
    }

    const filesInFolder = await this.db
      .select({ id: companyFiles.id })
      .from(companyFiles)
      .where(eq(companyFiles.folderId, id))
      .limit(1);

    if (filesInFolder.length) {
      throw new BadRequestException(
        'Cannot delete folder that contains files.',
      );
    }

    const child = await this.db
      .select({ id: companyFileFolders.id })
      .from(companyFileFolders)
      .where(eq(companyFileFolders.parentId, id))
      .limit(1);

    if (child.length) {
      throw new BadRequestException(
        'Cannot delete folder that contains subfolders.',
      );
    }

    await this.db
      .delete(companyFileFolders)
      .where(eq(companyFileFolders.id, id));

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
