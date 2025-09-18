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
const employee_invitation_service_1 = require("./employee-invitation.service");
const goal_notification_service_1 = require("./goal-notification.service");
const announcement_notification_service_1 = require("./announcement-notification.service");
let EmailQueueProcessor = class EmailQueueProcessor extends bullmq_1.WorkerHost {
    constructor(employeeInvitationService, goalNotificationService, announcementNotificationService) {
        super();
        this.employeeInvitationService = employeeInvitationService;
        this.goalNotificationService = goalNotificationService;
        this.announcementNotificationService = announcementNotificationService;
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'sendPasswordResetEmail':
                    await this.handleEmployeeInvitationEmail(job.data);
                    break;
                case 'sendGoalCheckin':
                    await this.handleGoalCheckin(job.data);
                    break;
                case 'sendAnnouncement':
                    await this.handleAnnouncement(job.data);
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
    async handleEmployeeInvitationEmail(data) {
        const { email, name, companyName, role, resetLink } = data;
        await this.employeeInvitationService.sendInvitationEmail(email, name, companyName, role, resetLink);
    }
    async handleGoalCheckin(data) {
        await this.goalNotificationService.sendGoalCheckin(data);
    }
    async handleAnnouncement(data) {
        await this.announcementNotificationService.sendNewAnnouncement(data);
    }
};
exports.EmailQueueProcessor = EmailQueueProcessor;
exports.EmailQueueProcessor = EmailQueueProcessor = __decorate([
    (0, bullmq_1.Processor)('emailQueue'),
    __metadata("design:paramtypes", [employee_invitation_service_1.EmployeeInvitationService,
        goal_notification_service_1.GoalNotificationService,
        announcement_notification_service_1.AnnouncementNotificationService])
], EmailQueueProcessor);
//# sourceMappingURL=email-queue.processor.js.map