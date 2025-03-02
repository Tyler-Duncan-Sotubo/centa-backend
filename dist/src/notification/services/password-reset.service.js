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
exports.PasswordResetEmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
let PasswordResetEmailService = class PasswordResetEmailService {
    constructor(config) {
        this.config = config;
    }
    async sendPasswordResetEmail(email, name, url) {
        sgMail.setApiKey(this.config.get('SEND_GRID_KEY') || '');
        const msg = {
            to: email,
            from: {
                name: 'Password Reset',
                email: 'noreply@iconaistudio.com',
            },
            templateId: this.config.get('PASSWORD_RESET_TEMPLATE_ID'),
            dynamicTemplateData: {
                name: name,
                verifyLink: url,
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
exports.PasswordResetEmailService = PasswordResetEmailService;
exports.PasswordResetEmailService = PasswordResetEmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PasswordResetEmailService);
//# sourceMappingURL=password-reset.service.js.map