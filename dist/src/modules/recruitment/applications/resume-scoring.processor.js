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
exports.ResumeScoringProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const resume_scoring_service_1 = require("./resume-scoring.service");
let ResumeScoringProcessor = class ResumeScoringProcessor extends bullmq_1.WorkerHost {
    constructor(resumeScoringService, queue) {
        super();
        this.resumeScoringService = resumeScoringService;
        this.queue = queue;
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'score-resume':
                    await this.retryWithLogging(() => this.handleResumeScoring(job.data), job.name);
                    break;
                default:
                    console.warn(`⚠️ Unhandled job: ${job.name}`);
            }
        }
        catch (error) {
            console.error(`❌ Final error in job ${job.name}:`, error);
            throw error;
        }
    }
    async retryWithLogging(task, jobName, attempts = 3, delay = 1000) {
        for (let i = 1; i <= attempts; i++) {
            try {
                await task();
                return;
            }
            catch (err) {
                console.warn(`⏱️ Attempt ${i} failed for ${jobName}:`, err.message || err);
                if (i < attempts)
                    await new Promise((res) => setTimeout(res, delay));
                else
                    throw err;
            }
        }
    }
    async handleResumeScoring(data) {
        const { resumeUrl, job, applicationId } = data;
        if (!resumeUrl || !job || !applicationId) {
            throw new Error('Missing required resume scoring data');
        }
        await this.resumeScoringService.analyzeResumeFromUrl(resumeUrl, job, applicationId);
    }
};
exports.ResumeScoringProcessor = ResumeScoringProcessor;
exports.ResumeScoringProcessor = ResumeScoringProcessor = __decorate([
    (0, bullmq_1.Processor)('resumeScoringQueue'),
    __param(1, (0, bullmq_1.InjectQueue)('resumeScoringQueue')),
    __metadata("design:paramtypes", [resume_scoring_service_1.ResumeScoringService,
        bullmq_2.Queue])
], ResumeScoringProcessor);
//# sourceMappingURL=resume-scoring.processor.js.map