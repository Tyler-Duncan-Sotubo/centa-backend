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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginVerificationService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const email_verification_service_1 = require("../../notification/services/email-verification.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let LoginVerificationService = class LoginVerificationService {
    constructor(db, emailVerificationService, jwtService, configService) {
        this.db = db;
        this.emailVerificationService = emailVerificationService;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async generateVerificationToken(userId, tempToken) {
        if (tempToken) {
            const payload = await this.jwtService.verifyAsync(tempToken, {
                secret: this.configService.get('JWT_SECRET'),
            });
            userId = payload.sub;
        }
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 1000 * 60 * 10);
        const [user] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (!user) {
            throw new common_1.BadRequestException('User not found.');
        }
        await this.db
            .update(schema_1.users)
            .set({
            verificationCode: token,
            verificationCodeExpiresAt: expires_at,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
            .execute();
        await this.emailVerificationService.sendVerifyLogin(user.email, token);
        return token;
    }
    async regenerateVerificationToken(tempToken) {
        const payload = await this.jwtService.verifyAsync(tempToken, {
            secret: this.configService.get('JWT_SECRET'),
        });
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 1000 * 60 * 10);
        const [user] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, payload.sub));
        if (!user) {
            throw new common_1.BadRequestException('User not found.');
        }
        await this.db
            .update(schema_1.users)
            .set({
            verificationCode: token,
            verificationCodeExpiresAt: expires_at,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
            .execute();
        await this.emailVerificationService.sendVerifyLogin(user.email, token);
        return token;
    }
};
exports.LoginVerificationService = LoginVerificationService;
exports.LoginVerificationService = LoginVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, email_verification_service_1.EmailVerificationService,
        jwt_1.JwtService,
        config_1.ConfigService])
], LoginVerificationService);
//# sourceMappingURL=login-verification.service.js.map