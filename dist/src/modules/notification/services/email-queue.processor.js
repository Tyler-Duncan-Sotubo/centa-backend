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
const bullmq_2 = require("bullmq");
const common_1 = require("@nestjs/common");
const employee_invitation_service_1 = require("./employee-invitation.service");
const goal_notification_service_1 = require("./goal-notification.service");
const announcement_notification_service_1 = require("./announcement-notification.service");
const notification_delivery_service_1 = require("../notification-delivery.service");
let EmailQueueProcessor = EmailQueueProcessor_1 = class EmailQueueProcessor extends bullmq_1.WorkerHost {
    constructor(employeeInvitationService, goalNotificationService, announcementNotificationService, notificationDeliveryService) {
        super();
        this.employeeInvitationService = employeeInvitationService;
        this.goalNotificationService = goalNotificationService;
        this.announcementNotificationService = announcementNotificationService;
        this.notificationDeliveryService = notificationDeliveryService;
        this.logger = new common_1.Logger(EmailQueueProcessor_1.name);
        this.logger.warn({
            op: 'email.worker.boot',
            pid: process.pid,
            queue: 'emailQueue',
        });
    }
    onReady() {
        this.logger.warn({ op: 'email.worker.ready', queue: 'emailQueue' });
    }
    onFailed(job, err) {
        this.logger.error({
            op: 'email.worker.failed',
            queue: 'emailQueue',
            jobId: job?.id,
            jobName: job?.name,
            attemptsMade: job?.attemptsMade,
            err: err?.message,
        }, err?.stack);
    }
    onCompleted(job) {
        this.logger.log({
            op: 'email.worker.completed',
            queue: 'emailQueue',
            jobId: job?.id,
            jobName: job?.name,
        });
    }
    async process(job) {
        const { id, name, attemptsMade, opts, data } = job;
        this.logger.log({
            op: 'email.worker.got_job',
            queue: job.queueName,
            jobId: id,
            jobName: name,
            attemptsMade,
            maxAttempts: opts?.attempts,
            data,
        });
        try {
            this.logger.log({
                op: 'email.worker.route',
                jobId: id,
                jobName: name,
            });
            switch (name) {
                case 'sendPasswordResetEmail':
                    await this.employeeInvitationService.sendInvitationEmail(data.email, data.name, data.companyName, data.role, data.resetLink);
                    break;
                case 'sendGoalCheckin':
                    await this.goalNotificationService.sendGoalCheckin(data);
                    break;
                case 'sendAnnouncement':
                    await this.announcementNotificationService.sendNewAnnouncement(data);
                    break;
                case 'sendNotificationEvent':
                    this.logger.log({
                        op: 'email.worker.route.sendNotificationEvent',
                        jobId: id,
                        data,
                    });
                    if (!data?.notificationEventId) {
                        this.logger.error({
                            op: 'email.worker.sendNotificationEvent.missing_event_id',
                            jobId: id,
                            jobName: name,
                            data,
                        });
                        throw new Error('notificationEventId missing from job.data');
                    }
                    await this.notificationDeliveryService.deliver(data.notificationEventId);
                    break;
                default:
                    this.logger.warn({
                        op: 'email.worker.unhandled',
                        jobId: id,
                        jobName: name,
                    });
                    return;
            }
            this.logger.log({
                op: 'email.worker.success',
                queue: job.queueName,
                jobId: id,
                jobName: name,
            });
        }
        catch (error) {
            this.logger.error({
                op: 'email.worker.process_failed',
                queue: job.queueName,
                jobId: id,
                jobName: name,
                attemptsMade,
                willRetry: attemptsMade < (opts?.attempts ?? 1),
                errorMessage: error?.message,
            }, error?.stack);
            throw error;
        }
    }
};
exports.EmailQueueProcessor = EmailQueueProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EmailQueueProcessor.prototype, "onReady", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], EmailQueueProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], EmailQueueProcessor.prototype, "onCompleted", null);
exports.EmailQueueProcessor = EmailQueueProcessor = EmailQueueProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('emailQueue', {
        concurrency: 5,
        limiter: {
            max: 30,
            duration: 1000,
        },
    }),
    __metadata("design:paramtypes", [employee_invitation_service_1.EmployeeInvitationService,
        goal_notification_service_1.GoalNotificationService,
        announcement_notification_service_1.AnnouncementNotificationService,
        notification_delivery_service_1.NotificationDeliveryService])
], EmailQueueProcessor);
//# sourceMappingURL=email-queue.processor.js.map