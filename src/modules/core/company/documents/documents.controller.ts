import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsFolderService } from './documents-folder.service';
import { User } from 'src/common/types/user.type';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateDocumentFoldersDto } from './dto/create-folders.dto';
import { UpdateDocumentFoldersDto } from './dto/update-folders.dto';

@Controller('documents')
export class DocumentsController extends BaseController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly documentFolderService: DocumentsFolderService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  create(
    @CurrentUser() user: User,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.uploadDocument(createDocumentDto, user);
  }

  @Delete('files/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.deleteCompanyFile(id, user);
  }

  // Document Folders Endpoints
  @Post('folders')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  createFolder(
    @CurrentUser() user: User,
    @Body() createFolderDto: CreateDocumentFoldersDto,
  ) {
    return this.documentFolderService.create(createFolderDto, user);
  }

  @Get('folders')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  findAllFolders(@CurrentUser() user: User) {
    return this.documentFolderService.findAll(user.companyId);
  }

  @Get('folders/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  findOneFolder(@Param('id') id: string) {
    return this.documentFolderService.findOne(id);
  }

  @Patch('folders/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  updateFolder(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateDocumentFoldersDto,
    @CurrentUser() user: User,
  ) {
    return this.documentFolderService.update(id, updateFolderDto, user);
  }

  @Delete('folders/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['company_tax.read'])
  removeFolder(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentFolderService.remove(id, user.id);
  }
}
