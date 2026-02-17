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
exports.AnnouncementNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let AnnouncementNotificationService = class AnnouncementNotificationService {
    constructor(config) {
        this.config = config;
    }
    async sendNewAnnouncement(payload) {
        const apiKey = this.config.get('SEND_GRID_KEY') || '';
        sgMail.setApiKey(apiKey);
        const templateId = this.config.get('ANNOUNCEMENT_TEMPLATE_ID') || '';
        const url = `${this.config.get('EMPLOYEE_PORTAL_URL')}/ess/announcement/${payload.meta?.announcementId || ''}`;
        const msg = {
            to: payload.toEmail,
            from: {
                name: payload.companyName || 'Announcements',
                email: 'noreply@centahr.com',
            },
            templateId,
            subject: payload.subject,
            dynamicTemplateData: {
                firstName: payload.firstName,
                title: payload.title,
                url,
                body: payload.body,
                publishedAt: payload.publishedAt,
                expiresAt: payload.expiresAt,
                companyName: payload.companyName,
                subject: payload.subject,
                ...payload.meta,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[AnnouncementNotificationService] sendNewAnnouncement failed', error);
            if (error?.response?.body)
                console.error(error.response.body);
        }
    }
    async sendAssessmentReminder(payload) {
        const apiKey = this.config.get('SEND_GRID_KEY') || '';
        sgMail.setApiKey(apiKey);
        const templateId = this.config.get('ASSESSMENT_REMINDER_TEMPLATE_ID') || '';
        const url = `${this.config.get('EMPLOYEE_PORTAL_URL')}/ess/performance/reviews/${payload.meta?.assessmentId || ''}`;
        const msg = {
            to: payload.toEmail,
            from: {
                name: payload.companyName || 'Performance Team',
                email: 'noreply@centahr.com',
            },
            templateId,
            subject: payload.subject,
            dynamicTemplateData: {
                firstName: payload.firstName,
                employeeName: payload.employeeName,
                reviewerName: payload.reviewerName,
                cycleName: payload.cycleName,
                dueDate: payload.dueDate,
                companyName: payload.companyName,
                url,
                subject: payload.subject,
                ...payload.meta,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[AnnouncementNotificationService] sendAssessmentReminder failed', error);
            if (error?.response?.body)
                console.error(error.response.body);
        }
    }
};
exports.AnnouncementNotificationService = AnnouncementNotificationService;
exports.AnnouncementNotificationService = AnnouncementNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AnnouncementNotificationService);
//# sourceMappingURL=announcement-notification.service.js.map