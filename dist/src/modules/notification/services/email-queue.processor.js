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
var EmailQueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueueProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const employee_invitation_service_1 = require("./employee-invitation.service");
const goal_notification_service_1 = require("./goal-notification.service");
const announcement_notification_service_1 = require("./announcement-notification.service");
let EmailQueueProcessor = EmailQueueProcessor_1 = class EmailQueueProcessor extends bullmq_1.WorkerHost {
    constructor(employeeInvitationService, goalNotificationService, announcementNotificationService) {
        super();
        this.employeeInvitationService = employeeInvitationService;
        this.goalNotificationService = goalNotificationService;
        this.announcementNotificationService = announcementNotificationService;
        this.logger = new common_1.Logger(EmailQueueProcessor_1.name);
    }
    async process(job) {
        const { id, name, attemptsMade, opts } = job;
        this.logger.log({
            op: 'email.job.start',
            jobId: id,
            jobName: name,
            attemptsMade,
            maxAttempts: opts?.attempts,
            queue: job.queueName,
        });
        try {
            switch (name) {
                case 'sendPasswordResetEmail':
                    this.logger.debug({
                        op: 'email.invite.payload',
                        jobId: id,
                        email: job.data?.email,
                        companyName: job.data?.companyName,
                        role: job.data?.role,
                    });
                    await this.handleEmployeeInvitationEmail(job.data);
                    break;
                case 'sendGoalCheckin':
                    this.logger.debug({
                        op: 'email.goalCheckin.payload',
                        jobId: id,
                        employeeId: job.data?.employeeId,
                        goalId: job.data?.goalId,
                    });
                    await this.handleGoalCheckin(job.data);
                    break;
                case 'sendAnnouncement':
                    this.logger.debug({
                        op: 'email.announcement.payload',
                        jobId: id,
                        announcementId: job.data?.announcementId,
                    });
                    await this.handleAnnouncement(job.data);
                    break;
                default:
                    this.logger.warn({
                        op: 'email.job.unhandled',
                        jobId: id,
                        jobName: name,
                    });
                    return;
            }
            this.logger.log({
                op: 'email.job.success',
                jobId: id,
                jobName: name,
            });
        }
        catch (error) {
            this.logger.error({
                op: 'email.job.failed',
                jobId: id,
                jobName: name,
                attemptsMade,
                willRetry: attemptsMade < (opts?.attempts ?? 1),
                errorMessage: error?.message,
            }, error?.stack);
            throw error;
        }
    }
    async handleEmployeeInvitationEmail(data) {
        const { email, name, companyName, role } = data;
        this.logger.log({
            op: 'email.invite.send',
            email,
            companyName,
            role,
        });
        await this.employeeInvitationService.sendInvitationEmail(email, name, companyName, role, data.resetLink);
    }
    async handleGoalCheckin(data) {
        await this.goalNotificationService.sendGoalCheckin(data);
    }
    async handleAnnouncement(data) {
        await this.announcementNotificationService.sendNewAnnouncement(data);
    }
};
exports.EmailQueueProcessor = EmailQueueProcessor;
exports.EmailQueueProcessor = EmailQueueProcessor = EmailQueueProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('emailQueue'),
    __metadata("design:paramtypes", [employee_invitation_service_1.EmployeeInvitationService,
        goal_notification_service_1.GoalNotificationService,
        announcement_notification_service_1.AnnouncementNotificationService])
], EmailQueueProcessor);
//# sourceMappingURL=email-queue.processor.js.map