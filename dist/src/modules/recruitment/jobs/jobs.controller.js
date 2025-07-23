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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const jobs_service_1 = require("./jobs.service");
const create_job_dto_1 = require("./dto/create-job.dto");
const update_job_dto_1 = require("./dto/update-job.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const applicationForm_service_1 = require("./applicationForm.service");
const config_dto_1 = require("./dto/config.dto");
const public_jobs_dto_1 = require("./dto/public-jobs.dto");
const company_job_dto_1 = require("./dto/company-job.dto");
let JobsController = class JobsController extends base_controller_1.BaseController {
    constructor(jobsService, applicationFormService) {
        super();
        this.jobsService = jobsService;
        this.applicationFormService = applicationFormService;
    }
    create(createJobDto, user) {
        return this.jobsService.create(createJobDto, user);
    }
    postJob(id, user) {
        return this.jobsService.postJob(id, user);
    }
    findAll(user) {
        return this.jobsService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.jobsService.findOne(id, user.companyId);
    }
    update(id, updateJobDto, user) {
        return this.jobsService.update(id, user, updateJobDto);
    }
    remove(id, user) {
        return this.jobsService.remove(id, user);
    }
    upsertApplicationForm(jobId, config, user) {
        return this.applicationFormService.upsertApplicationForm(jobId, user, config);
    }
    getApplicationForm(jobId) {
        return this.applicationFormService.getFormPreview(jobId);
    }
    getApplicationFields() {
        return this.applicationFormService.getDefaultFields();
    }
    findPublicJobs(filters) {
        return this.jobsService.publicJobs(filters);
    }
    publicJob(id) {
        return this.jobsService.publicJob(id);
    }
    async findCompanyJobs(query) {
        return this.jobsService.publicCompanyJobs(query);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_job_dto_1.CreateJobDto, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "postJob", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_job_dto_1.UpdateJobDto, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('archive/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':jobId/application-form'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)('config')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, config_dto_1.ConfigDto, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "upsertApplicationForm", null);
__decorate([
    (0, common_1.Get)(':jobId/application-form'),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getApplicationForm", null);
__decorate([
    (0, common_1.Get)('application-form/field-definitions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['jobs.manage']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getApplicationFields", null);
__decorate([
    (0, common_1.Get)('public'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [public_jobs_dto_1.PublicJobsDto]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "findPublicJobs", null);
__decorate([
    (0, common_1.Get)('public/job'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "publicJob", null);
__decorate([
    (0, common_1.Get)('company-jobs'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_job_dto_1.CompanyJobsDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "findCompanyJobs", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService,
        applicationForm_service_1.ApplicationFormService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map