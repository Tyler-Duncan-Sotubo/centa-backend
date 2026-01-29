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
var EmailVerificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sgMail = require("@sendgrid/mail");
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function getStatusCode(err) {
    return err?.code ?? err?.response?.statusCode;
}
function isRetryable(err) {
    const status = getStatusCode(err);
    if (!status) {
        return true;
    }
    return status === 429 || (status >= 500 && status <= 599);
}
function backoffMs(attempt, base = 250, cap = 5000) {
    const exp = Math.min(cap, base * 2 ** (attempt - 1));
    const jitter = Math.floor(Math.random() * 200);
    return exp + jitter;
}
let EmailVerificationService = EmailVerificationService_1 = class EmailVerificationService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(EmailVerificationService_1.name);
    }
    onModuleInit() {
        const key = this.config.get('SEND_GRID_KEY');
        if (!key) {
            this.logger.error('SEND_GRID_KEY is missing');
            return;
        }
        sgMail.setApiKey(key);
    }
    async sendWithRetry(msg, maxAttempts = 4) {
        let lastErr;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await Promise.race([
                    sgMail.send(msg),
                    (async () => {
                        await sleep(10_000);
                        throw new Error('SendGrid send timeout after 10s');
                    })(),
                ]);
                return;
            }
            catch (err) {
                lastErr = err;
                const status = getStatusCode(err);
                const body = err?.response?.body;
                this.logger.warn(`SendGrid send failed (attempt ${attempt}/${maxAttempts}) status=${status ?? 'n/a'}`);
                if (body)
                    this.logger.debug(body);
                if (!isRetryable(err) || attempt === maxAttempts)
                    break;
                await sleep(backoffMs(attempt));
            }
        }
        throw lastErr;
    }
    async sendVerifyEmail(email, token, companyName) {
        const msg = {
            to: email,
            from: { name: 'noreply@centahr.com', email: 'noreply@centahr.com' },
            templateId: this.config.get('VERIFY_TEMPLATE_ID'),
            dynamicTemplateData: {
                verificationCode: token,
                email,
                companyName,
            },
        };
        await this.sendWithRetry(msg);
    }
    async sendVerifyLogin(email, token) {
        const msg = {
            to: email,
            from: { name: 'noreply@centahr.com', email: 'noreply@centahr.com' },
            templateId: this.config.get('VERIFY_LOGIN_TEMPLATE_ID'),
            dynamicTemplateData: {
                verificationCode: token,
                email,
            },
        };
        await this.sendWithRetry(msg);
    }
};
exports.EmailVerificationService = EmailVerificationService;
exports.EmailVerificationService = EmailVerificationService = EmailVerificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailVerificationService);
//# sourceMappingURL=email-verification.service.js.map