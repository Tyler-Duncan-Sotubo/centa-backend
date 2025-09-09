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
exports.ContactEmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let ContactEmailService = class ContactEmailService {
    constructor(config) {
        this.config = config;
    }
    async sendContactEmail(dto) {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
        const { email, name, message, phone, website } = dto;
        const msg = {
            to: this.config.get('NOTIFY_EMAIL_TO'),
            from: {
                name: 'noreply@centahr.com',
                email: 'noreply@centahr.com',
            },
            templateId: this.config.get('CONTACT_TEMPLATE_ID'),
            dynamicTemplateData: {
                email,
                name,
                message,
                phone: phone || 'N/A',
                website: website || 'N/A',
                subject: `New Contact Us Message from ${name}`,
            },
        };
        (async () => {
            try {
                await sgMail.send(msg);
            }
            catch (error) {
                console.error(error);
                if (error.response) {
                    console.error(error.response.body);
                }
            }
        })();
    }
};
exports.ContactEmailService = ContactEmailService;
exports.ContactEmailService = ContactEmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ContactEmailService);
//# sourceMappingURL=contact-email.service.js.map