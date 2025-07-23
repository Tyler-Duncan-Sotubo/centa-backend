"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentModule = void 0;
const common_1 = require("@nestjs/common");
const jobs_module_1 = require("./jobs/jobs.module");
const candidates_module_1 = require("./candidates/candidates.module");
const interviews_module_1 = require("./interviews/interviews.module");
const offers_module_1 = require("./offers/offers.module");
const applications_module_1 = require("./applications/applications.module");
const pipeline_module_1 = require("./pipeline/pipeline.module");
const pipeline_seeder_service_1 = require("./pipeline/pipeline-seeder.service");
let RecruitmentModule = class RecruitmentModule {
};
exports.RecruitmentModule = RecruitmentModule;
exports.RecruitmentModule = RecruitmentModule = __decorate([
    (0, common_1.Module)({
        providers: [pipeline_seeder_service_1.PipelineSeederService],
        imports: [
            jobs_module_1.JobsModule,
            candidates_module_1.CandidatesModule,
            interviews_module_1.InterviewsModule,
            offers_module_1.OffersModule,
            applications_module_1.ApplicationsModule,
            pipeline_module_1.PipelineModule,
        ],
        exports: [
            jobs_module_1.JobsModule,
            candidates_module_1.CandidatesModule,
            interviews_module_1.InterviewsModule,
            offers_module_1.OffersModule,
            applications_module_1.ApplicationsModule,
            pipeline_module_1.PipelineModule,
            pipeline_seeder_service_1.PipelineSeederService,
        ],
    })
], RecruitmentModule);
//# sourceMappingURL=recruitment.module.js.map