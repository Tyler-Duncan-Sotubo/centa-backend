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
exports.LeaveNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let LeaveNotificationService = class LeaveNotificationService {
    constructor(config) {
        this.config = config;
        this.logoUrl = 'https://centa-hr.s3.eu-west-3.amazonaws.com/company-files/7beedcd5-66c3-4351-8955-ddcab3528652/5cf61059-52be-4c46-9d4e-9817f2b9257b/1769600186954-1768990436384-logo-CqG_6WrI.png';
    }
    ensureSendGrid() {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
    }
    buildSubject(status) {
        if (status === 'pending')
            return 'Approval Needed: Leave Request';
        if (status === 'approved')
            return 'Leave Request Approved';
        return 'Leave Request Rejected';
    }
    buildStatusTitle(status) {
        if (status === 'pending')
            return 'Pending';
        if (status === 'approved')
            return 'Approved';
        return 'Rejected';
    }
    buildStatusMessage(status) {
        if (status === 'pending')
            return 'a leave request has been submitted and is awaiting your review.';
        if (status === 'approved')
            return 'the leave request has been approved.';
        return 'the leave request has been rejected.';
    }
    buildActionUrl(payload) {
        if (payload.actionUrl)
            return payload.actionUrl;
        const base = this.config.get('EMPLOYEE_PORTAL_URL') || '';
        if (!base)
            return undefined;
        if (payload.status === 'pending') {
            return `${base}/dashboard/leave}`;
        }
        return `${base}/ess/leave}`;
    }
    pickTemplateId(status) {
        if (status === 'pending') {
            return this.config.get('LEAVE_REQUEST_TEMPLATE_ID') || '';
        }
        return this.config.get('LEAVE_STATUS_TEMPLATE_ID') || '';
    }
    async sendLeaveEmail(payload) {
        this.ensureSendGrid();
        const templateId = this.pickTemplateId(payload.status);
        const actionUrl = this.buildActionUrl(payload);
        const msg = {
            to: payload.toEmail,
            from: {
                name: 'CentaHR',
                email: 'noreply@centahr.com',
            },
            templateId,
            dynamicTemplateData: {
                subject: this.buildSubject(payload.status),
                logoUrl: this.logoUrl,
                companyName: payload.companyName,
                status: payload.status,
                statusTitle: this.buildStatusTitle(payload.status),
                statusMessage: this.buildStatusMessage(payload.status),
                managerName: payload.managerName,
                employeeName: payload.employeeName,
                leaveType: payload.leaveType,
                startDate: payload.startDate,
                endDate: payload.endDate,
                totalDays: payload.totalDays,
                reason: payload.reason,
                rejectionReason: payload.rejectionReason,
                actionUrl,
                actionText: 'View Request',
                leaveRequestId: payload.leaveRequestId,
                employeeId: payload.employeeId,
                approverId: payload.approverId,
                meta: payload.meta,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[LeaveNotificationService] sendLeaveEmail failed', error);
            if (error?.response)
                console.error(error.response.body);
        }
    }
    async sendLeaveApprovalRequestEmail(payload) {
        return this.sendLeaveEmail({ ...payload, status: 'pending' });
    }
    async sendLeaveDecisionEmail(payload) {
        return this.sendLeaveEmail(payload);
    }
};
exports.LeaveNotificationService = LeaveNotificationService;
exports.LeaveNotificationService = LeaveNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LeaveNotificationService);
//# sourceMappingURL=leave-notification.service.js.map