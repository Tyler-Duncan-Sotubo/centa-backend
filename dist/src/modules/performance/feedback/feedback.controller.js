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
exports.FeedbackController = void 0;
const common_1 = require("@nestjs/common");
const feedback_service_1 = require("./feedback.service");
const create_feedback_dto_1 = require("./dto/create-feedback.dto");
const update_feedback_dto_1 = require("./dto/update-feedback.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let FeedbackController = class FeedbackController extends base_controller_1.BaseController {
    constructor(feedbackService) {
        super();
        this.feedbackService = feedbackService;
    }
    create(createFeedbackDto, user) {
        return this.feedbackService.create(createFeedbackDto, user);
    }
    findAll(user, type, departmentId) {
        return this.feedbackService.findAll(user.companyId, {
            type,
            departmentId,
        });
    }
    getCounts(user) {
        return this.feedbackService.getCounts(user.companyId);
    }
    getCountsForEmployee(employeeId, user) {
        return this.feedbackService.getCountsForEmployee(user.companyId, employeeId);
    }
    getForEmployee(employeeId, user, type) {
        return this.feedbackService.findAllByEmployeeId(user.companyId, employeeId, {
            type,
        });
    }
    getForRecipient(recipientId, user) {
        return this.feedbackService.getFeedbackForRecipient(recipientId, user);
    }
    findOne(id, user) {
        return this.feedbackService.findOne(id, user);
    }
    update(id, dto, user) {
        return this.feedbackService.update(id, dto, user);
    }
    remove(id, user) {
        return this.feedbackService.remove(id, user);
    }
};
exports.FeedbackController = FeedbackController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.submit_self',
        'performance.reviews.submit_peer',
        'performance.reviews.submit_manager',
    ]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_feedback_dto_1.CreateFeedbackDto, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)('counts/employee/:employeeId'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "getCountsForEmployee", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "getForEmployee", null);
__decorate([
    (0, common_1.Get)('recipient/:recipientId'),
    (0, common_1.SetMetadata)('permissions', [
        'performance.reviews.read',
        'performance.reviews.read_team',
        'performance.reviews.manage_all',
    ]),
    __param(0, (0, common_1.Param)('recipientId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "getForRecipient", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_feedback_dto_1.UpdateFeedbackDto, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.SetMetadata)('permissions', ['performance.reviews.manage_all']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "remove", null);
exports.FeedbackController = FeedbackController = __decorate([
    (0, common_1.Controller)('feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [feedback_service_1.FeedbackService])
], FeedbackController);
//# sourceMappingURL=feedback.controller.js.map