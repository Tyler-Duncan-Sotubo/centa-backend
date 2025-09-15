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
exports.GoalNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let GoalNotificationService = class GoalNotificationService {
    constructor(config) {
        this.config = config;
    }
    async sendGoalCheckin(payload) {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
        const templateId = this.config.get('GOAL_CHECKIN_TEMPLATE_ID') || '';
        const goalPage = `${this.config.get('EMPLOYEE_PORTAL_URL')}/dashboard/performance/goals/${payload.meta?.goalId || ''}`;
        const msg = {
            to: payload.toEmail,
            from: {
                name: 'Goal Check-in',
                email: 'noreply@centa.africa',
            },
            templateId,
            dynamicTemplateData: {
                subject: payload.subject,
                body: payload.body,
                goalId: payload.meta?.goalId,
                url: goalPage,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[NotificationService] sendGoalCheckin failed', error);
            if (error.response) {
                console.error(error.response.body);
            }
        }
    }
    async sendGoalAssignment(payload) {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
        const templateId = this.config.get('GOAL_ASSIGNMENT_TEMPLATE_ID');
        const goalPage = `${this.config.get('EMPLOYEE_PORTAL_URL')}/dashboard/performance/goals/${payload.meta?.goalId || ''}`;
        console.log(payload);
        const msg = {
            to: payload.toEmail,
            from: {
                name: 'Goal Assignment',
                email: 'noreply@centahr.com',
            },
            templateId,
            dynamicTemplateData: {
                subject: payload.subject,
                assignedBy: payload.assignedBy,
                assignedTo: payload.assignedTo,
                title: payload.title,
                dueDate: payload.dueDate,
                description: payload.description,
                progress: payload.progress,
                url: goalPage,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[NotificationService] sendGoalAssignment failed', error);
            if (error.response) {
                console.error(error.response.body);
            }
        }
    }
};
exports.GoalNotificationService = GoalNotificationService;
exports.GoalNotificationService = GoalNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoalNotificationService);
//# sourceMappingURL=goal-notification.service.js.map