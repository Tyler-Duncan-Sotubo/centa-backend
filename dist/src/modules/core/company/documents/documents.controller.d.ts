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
    createFolder(user: User, createFolderDto: CreateDocumentFoldersDto): Promise<any>;
    findAllFolders(user: User): Promise<any[]>;
    findOneFolder(id: string): Promise<{
        [x: string]: any;
    }>;
    updateFolder(id: string, updateFolderDto: UpdateDocumentFoldersDto, user: User): Promise<{
        [x: string]: any;
    }>;
    removeFolder(id: string, user: User): Promise<{
        success: boolean;
    }>;
}
