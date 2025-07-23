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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const documents_service_1 = require("./documents.service");
const create_document_dto_1 = require("./dto/create-document.dto");
const documents_folder_service_1 = require("./documents-folder.service");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const create_folders_dto_1 = require("./dto/create-folders.dto");
const update_folders_dto_1 = require("./dto/update-folders.dto");
let DocumentsController = class DocumentsController extends base_controller_1.BaseController {
    constructor(documentsService, documentFolderService) {
        super();
        this.documentsService = documentsService;
        this.documentFolderService = documentFolderService;
    }
    create(user, createDocumentDto) {
        return this.documentsService.uploadDocument(createDocumentDto, user);
    }
    remove(id, user) {
        return this.documentsService.deleteCompanyFile(id, user);
    }
    createFolder(user, createFolderDto) {
        return this.documentFolderService.create(createFolderDto, user);
    }
    findAllFolders(user) {
        return this.documentFolderService.findAll(user.companyId);
    }
    findOneFolder(id) {
        return this.documentFolderService.findOne(id);
    }
    updateFolder(id, updateFolderDto, user) {
        return this.documentFolderService.update(id, updateFolderDto, user);
    }
    removeFolder(id, user) {
        return this.documentFolderService.remove(id, user.id);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_document_dto_1.CreateDocumentDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)('files/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('folders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_folders_dto_1.CreateDocumentFoldersDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Get)('folders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findAllFolders", null);
__decorate([
    (0, common_1.Get)('folders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findOneFolder", null);
__decorate([
    (0, common_1.Patch)('folders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_folders_dto_1.UpdateDocumentFoldersDto, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "updateFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['company_tax.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "removeFolder", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService,
        documents_folder_service_1.DocumentsFolderService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map