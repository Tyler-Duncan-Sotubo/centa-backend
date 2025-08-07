import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsFolderService } from './documents-folder.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';
export declare class DocumentsController extends BaseController {
    private readonly documentsService;
    private readonly documentFolderService;
    constructor(documentsService: DocumentsService, documentFolderService: DocumentsFolderService);
    create(user: User, createDocumentDto: CreateDocumentDto): Promise<{
        id: any;
        name: any;
        url: string;
    }>;
    remove(id: string, user: User): Promise<{
        success: boolean;
    }>;
    createFolder(user: User, createFolderDto: CreateDocumentFoldersDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
    }>;
    findAllFolders(user: User): Promise<{
        files: {
            id: string;
            name: string;
            createdAt: Date | null;
            companyId: string;
            category: string;
            type: string;
            folderId: string | null;
            url: string;
            uploadedBy: string | null;
        }[];
        roleIds: string[];
        departmentIds: string[];
        officeIds: string[];
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }[]>;
    findOneFolder(id: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }>;
    updateFolder(id: string, updateFolderDto: UpdateDocumentFoldersDto, user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        permissionControlled: boolean | null;
        createdBy: string | null;
        isSystem: boolean;
        createdAt: Date | null;
    }>;
    removeFolder(id: string, user: User): Promise<{
        success: boolean;
    }>;
}
