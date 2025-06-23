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
exports.AnnouncementController = void 0;
const common_1 = require("@nestjs/common");
const announcement_service_1 = require("./announcement.service");
const create_announcement_dto_1 = require("./dto/create-announcement.dto");
const update_announcement_dto_1 = require("./dto/update-announcement.dto");
const comment_service_1 = require("./comment.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../common/interceptor/base.controller");
const create_announcement_comments_dto_1 = require("./dto/create-announcement-comments.dto");
const reaction_service_1 = require("./reaction.service");
const category_service_1 = require("./category.service");
const permission_keys_1 = require("../auth/permissions/permission-keys");
let AnnouncementController = class AnnouncementController extends base_controller_1.BaseController {
    constructor(announcementService, commentService, reactionService, categoryService) {
        super();
        this.announcementService = announcementService;
        this.commentService = commentService;
        this.reactionService = reactionService;
        this.categoryService = categoryService;
    }
    create(createAnnouncementDto, user) {
        return this.announcementService.create(createAnnouncementDto, user);
    }
    findAll(user) {
        return this.announcementService.findAll(user.companyId);
    }
    findAllLimitTwo(user) {
        return this.announcementService.findAllLimitTwo(user.companyId);
    }
    findOne(id, user) {
        return this.announcementService.findOne(id, user.id);
    }
    update(id, updateAnnouncementDto, user) {
        return this.announcementService.update(id, updateAnnouncementDto, user);
    }
    remove(id, user) {
        return this.announcementService.remove(id, user);
    }
    createComment(id, createCommentDto, user) {
        return this.commentService.createComment(createCommentDto, id, user);
    }
    reactToComment(id, reactionType, user) {
        return this.commentService.toggleCommentReaction(id, user.id, reactionType);
    }
    likeAnnouncement(id, reactionType, user) {
        return this.reactionService.reactToAnnouncement(id, reactionType, user);
    }
    createCategory(name, user) {
        return this.categoryService.createCategory(name, user);
    }
    updateCategory(id, name, user) {
        return this.categoryService.updateCategory(id, name, user);
    }
    deleteCategory(id, user) {
        return this.categoryService.deleteCategory(id, user);
    }
    listCategories(user) {
        return this.categoryService.listCategories(user.companyId);
    }
    getCreateElements(user) {
        return this.announcementService.getAllCreateElements(user.companyId);
    }
};
exports.AnnouncementController = AnnouncementController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_announcement_dto_1.CreateAnnouncementDto, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsRead]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('limit-two'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsRead]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "findAllLimitTwo", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsRead]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_announcement_dto_1.UpdateAnnouncementDto, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/comment'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsComment]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_announcement_comments_dto_1.CreateAnnouncementCommentDto, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "createComment", null);
__decorate([
    (0, common_1.Post)('comment/:id/reaction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsReact]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reactionType')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "reactToComment", null);
__decorate([
    (0, common_1.Post)(':id/reaction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsReact]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reactionType')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "likeAnnouncement", null);
__decorate([
    (0, common_1.Post)('category'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Body)('name')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('category/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('category/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsManage]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('category'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.AnnouncementsCategoryRead]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)('create-elements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['announcements.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AnnouncementController.prototype, "getCreateElements", null);
exports.AnnouncementController = AnnouncementController = __decorate([
    (0, common_1.Controller)('announcement'),
    __metadata("design:paramtypes", [announcement_service_1.AnnouncementService,
        comment_service_1.CommentService,
        reaction_service_1.ReactionService,
        category_service_1.CategoryService])
], AnnouncementController);
//# sourceMappingURL=announcement.controller.js.map