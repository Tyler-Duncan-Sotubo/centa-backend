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
exports.GoalsController = void 0;
const common_1 = require("@nestjs/common");
const goals_service_1 = require("./goals.service");
const goal_activity_service_1 = require("./goal-activity.service");
const create_goal_dto_1 = require("./dto/create-goal.dto");
const update_goal_dto_1 = require("./dto/update-goal.dto");
const add_goal_progress_dto_1 = require("./dto/add-goal-progress.dto");
const add_goal_comment_dto_1 = require("./dto/add-goal-comment.dto");
const upload_goal_attachment_dto_1 = require("./dto/upload-goal-attachment.dto");
const update_goal_attachment_dto_1 = require("./dto/update-goal-attachment.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let GoalsController = class GoalsController extends base_controller_1.BaseController {
    constructor(goalsService, activityService) {
        super();
        this.goalsService = goalsService;
        this.activityService = activityService;
    }
    create(dto, user) {
        return this.goalsService.create(dto, user);
    }
    findAll(user, status) {
        return this.goalsService.findAll(user.companyId, status);
    }
    findAllByEmployeeId(employeeId, user, status) {
        return this.goalsService.findAllByEmployeeId(user.companyId, employeeId, status);
    }
    findOne(id, user) {
        return this.goalsService.findOne(id, user.companyId);
    }
    async getStatusCounts(user) {
        return this.goalsService.getStatusCount(user.companyId);
    }
    async getStatusCountsForEmployee(user, employeeId) {
        return this.goalsService.getStatusCountForEmployee(user.companyId, employeeId);
    }
    update(id, dto, user) {
        return this.goalsService.update(id, dto, user);
    }
    publish(id) {
        return this.goalsService.publishGoalAndSubGoals(id);
    }
    remove(id, user) {
        return this.goalsService.remove(id, user);
    }
    archiveForEmployee(id, employeeId, user) {
        return this.goalsService.archiveForEmployee(id, employeeId, user);
    }
    addProgress(goalId, dto, user) {
        return this.activityService.addProgressUpdate(goalId, dto, user);
    }
    getProgress(goalId, user) {
        return this.activityService.getLatestProgressValue(goalId, user.companyId);
    }
    addComment(goalId, dto, user) {
        return this.activityService.addComment(goalId, user, dto);
    }
    updateComment(commentId, comment, user) {
        return this.activityService.updateComment(commentId, user, comment);
    }
    deleteComment(commentId, user) {
        return this.activityService.deleteComment(commentId, user);
    }
    uploadAttachment(goalId, dto, user) {
        return this.activityService.uploadGoalAttachment(goalId, dto, user);
    }
    updateAttachment(attachmentId, dto, user) {
        return this.activityService.updateAttachment(attachmentId, user, dto);
    }
    deleteAttachment(attachmentId, user) {
        return this.activityService.deleteAttachment(attachmentId, user);
    }
    approve(id, user) {
        return this.goalsService.approveGoal(id, user);
    }
    reject(id, reason, user) {
        return this.goalsService.rejectGoal(id, reason, user);
    }
};
exports.GoalsController = GoalsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.create']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_goal_dto_1.CreateGoalDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "findAllByEmployeeId", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('status-counts'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getStatusCounts", null);
__decorate([
    (0, common_1.Get)('status-counts/employee/:employeeId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GoalsController.prototype, "getStatusCountsForEmployee", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_goal_dto_1.UpdateGoalDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "publish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)(':id/:employeeId/archive'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "archiveForEmployee", null);
__decorate([
    (0, common_1.Post)(':id/progress'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_goal_progress_dto_1.AddGoalProgressDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "addProgress", null);
__decorate([
    (0, common_1.Get)(':id/progress'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_goal_comment_dto_1.AddGoalCommentDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Patch)('comments/:commentId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, common_1.Body)('comment')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, upload_goal_attachment_dto_1.UploadGoalAttachmentDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Patch)('attachments/:attachmentId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_goal_attachment_dto_1.UpdateGoalAttachmentDto, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "updateAttachment", null);
__decorate([
    (0, common_1.Delete)('attachments/:attachmentId'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('attachmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "deleteAttachment", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.SetMetadata)('permissions', ['performance.goals.edit']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GoalsController.prototype, "reject", null);
exports.GoalsController = GoalsController = __decorate([
    (0, common_1.Controller)('performance-goals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [goals_service_1.GoalsService,
        goal_activity_service_1.GoalActivityService])
], GoalsController);
//# sourceMappingURL=goals.controller.js.map