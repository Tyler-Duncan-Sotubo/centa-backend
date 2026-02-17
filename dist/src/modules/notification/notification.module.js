"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_controller_1 = require("./notifications.controller");
const bullmq_1 = require("@nestjs/bullmq");
const password_reset_service_1 = require("./services/password-reset.service");
const invitation_service_1 = require("./services/invitation.service");
const email_verification_service_1 = require("./services/email-verification.service");
const employee_invitation_service_1 = require("./services/employee-invitation.service");
const pusher_service_1 = require("./services/pusher.service");
const payroll_approval_service_1 = require("./services/payroll-approval.service");
const goal_notification_service_1 = require("./services/goal-notification.service");
const push_notification_service_1 = require("./services/push-notification.service");
const contact_email_service_1 = require("./services/contact-email.service");
const newsletter_email_service_1 = require("./services/newsletter-email.service");
const announcement_notification_service_1 = require("./services/announcement-notification.service");
const email_queue_processor_1 = require("./services/email-queue.processor");
const leave_notification_service_1 = require("./services/leave-notification.service");
const asset_notification_service_1 = require("./services/asset-notification.service");
const notification_delivery_service_1 = require("./notification-delivery.service");
const notification_engine_service_1 = require("./notification-engine.service");
const notification_planner_cron_1 = require("./cron/notification-planner.cron");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
        ],
        controllers: [notifications_controller_1.NotificationController],
        providers: [
            email_queue_processor_1.EmailQueueProcessor,
            notification_planner_cron_1.NotificationPlannerCron,
            password_reset_service_1.PasswordResetEmailService,
            invitation_service_1.InvitationService,
            email_verification_service_1.EmailVerificationService,
            employee_invitation_service_1.EmployeeInvitationService,
            pusher_service_1.PusherService,
            payroll_approval_service_1.PayrollApprovalEmailService,
            goal_notification_service_1.GoalNotificationService,
            push_notification_service_1.PushNotificationService,
            contact_email_service_1.ContactEmailService,
            newsletter_email_service_1.NewsletterEmailService,
            announcement_notification_service_1.AnnouncementNotificationService,
            leave_notification_service_1.LeaveNotificationService,
            asset_notification_service_1.AssetNotificationService,
            notification_delivery_service_1.NotificationDeliveryService,
            notification_engine_service_1.NotificationEngineService,
        ],
        exports: [
            password_reset_service_1.PasswordResetEmailService,
            invitation_service_1.InvitationService,
            email_verification_service_1.EmailVerificationService,
            employee_invitation_service_1.EmployeeInvitationService,
            pusher_service_1.PusherService,
            payroll_approval_service_1.PayrollApprovalEmailService,
            goal_notification_service_1.GoalNotificationService,
            push_notification_service_1.PushNotificationService,
            leave_notification_service_1.LeaveNotificationService,
            asset_notification_service_1.AssetNotificationService,
        ],
    })
], NotificationModule);
//# sourceMappingURL=notification.module.js.map