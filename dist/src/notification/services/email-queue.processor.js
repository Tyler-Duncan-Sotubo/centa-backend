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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const password_reset_service_1 = require("./password-reset.service");
let EmailQueueProcessor = class EmailQueueProcessor extends bullmq_1.WorkerHost {
    constructor(passwordResetEmailService) {
        super();
        this.passwordResetEmailService = passwordResetEmailService;
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'sendPasswordResetEmail':
                    await this.handlePasswordResetEmail(job.data);
                    break;
                default:
                    console.warn(`⚠️ Unhandled email job: ${job.name}`);
            }
        }
        catch (error) {
            console.error(`❌ Failed to process email job (${job.name}):`, error);
            throw error;
        }
    }
    async handlePasswordResetEmail(data) {
        const { email, name, resetLink } = data;
        await this.passwordResetEmailService.sendPasswordResetEmail(email, name, resetLink);
    }
};
exports.EmailQueueProcessor = EmailQueueProcessor;
exports.EmailQueueProcessor = EmailQueueProcessor = __decorate([
    (0, bullmq_1.Processor)('emailQueue'),
    __metadata("design:paramtypes", [password_reset_service_1.PasswordResetEmailService])
], EmailQueueProcessor);
//# sourceMappingURL=email-queue.processor.js.map