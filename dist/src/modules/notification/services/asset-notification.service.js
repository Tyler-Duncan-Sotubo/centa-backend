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
exports.AssetNotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let AssetNotificationService = class AssetNotificationService {
    constructor(config) {
        this.config = config;
        this.logoUrl = 'https://centa-hr.s3.eu-west-3.amazonaws.com/company-files/7beedcd5-66c3-4351-8955-ddcab3528652/5cf61059-52be-4c46-9d4e-9817f2b9257b/1769600186954-1768990436384-logo-CqG_6WrI.png';
    }
    ensureSendGrid() {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
    }
    buildSubject(status, assetType) {
        const type = assetType ? ` – ${assetType}` : '';
        if (status === 'requested')
            return `Approval Needed: Asset Request${type}`;
        if (status === 'approved')
            return `Asset Request Approved${type}`;
        return `Asset Request Rejected${type}`;
    }
    buildStatusTitle(status) {
        if (status === 'requested')
            return 'Requested';
        if (status === 'approved')
            return 'Approved';
        return 'Rejected';
    }
    buildStatusMessage(status) {
        if (status === 'requested')
            return 'an asset request has been submitted and is awaiting your review.';
        if (status === 'approved')
            return 'your asset request has been approved.';
        return 'your asset request has been rejected.';
    }
    buildActionUrl(payload) {
        if (payload.actionUrl)
            return payload.actionUrl;
        const base = this.config.get('EMPLOYEE_PORTAL_URL') || '';
        if (!base)
            return undefined;
        if (payload.status === 'requested') {
            return `${base}/dashboard/assets`;
        }
        return `${base}/ess/assets`;
    }
    pickTemplateId(status) {
        if (status === 'requested') {
            return this.config.get('ASSET_REQUEST_TEMPLATE_ID') || '';
        }
        return this.config.get('ASSET_STATUS_TEMPLATE_ID') || '';
    }
    async sendAssetEmail(payload) {
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
                subject: this.buildSubject(payload.status, payload.assetType),
                logoUrl: this.logoUrl,
                companyName: payload.companyName,
                status: payload.status,
                statusTitle: this.buildStatusTitle(payload.status),
                statusMessage: this.buildStatusMessage(payload.status),
                managerName: payload.managerName,
                employeeName: payload.employeeName,
                assetType: payload.assetType,
                purpose: payload.purpose,
                urgency: payload.urgency,
                notes: payload.notes,
                rejectionReason: payload.rejectionReason,
                remarks: payload.remarks,
                actionUrl,
                actionText: payload.status === 'requested' ? 'Review Request' : 'View Request',
                assetRequestId: payload.assetRequestId,
                employeeId: payload.employeeId,
                approverId: payload.approverId,
                meta: payload.meta,
            },
        };
        try {
            await sgMail.send(msg);
        }
        catch (error) {
            console.error('[AssetNotificationService] sendAssetEmail failed', error);
            if (error?.response)
                console.error(error.response.body);
        }
    }
    async sendAssetApprovalRequestEmail(payload) {
        return this.sendAssetEmail({ ...payload, status: 'requested' });
    }
    async sendAssetDecisionEmail(payload) {
        return this.sendAssetEmail(payload);
    }
};
exports.AssetNotificationService = AssetNotificationService;
exports.AssetNotificationService = AssetNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AssetNotificationService);
//# sourceMappingURL=asset-notification.service.js.map