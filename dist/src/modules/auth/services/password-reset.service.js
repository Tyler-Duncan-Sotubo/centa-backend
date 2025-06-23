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
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const schema_1 = require("../schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = require("bcryptjs");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const password_reset_service_1 = require("../../notification/services/password-reset.service");
const audit_service_1 = require("../../audit/audit.service");
let PasswordResetService = class PasswordResetService {
    constructor(db, passwordResetEmailService, configService, jwtService, auditService) {
        this.db = db;
        this.passwordResetEmailService = passwordResetEmailService;
        this.configService = configService;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }
    async generatePasswordResetToken(email) {
        const token = this.jwtService.sign({
            email,
        });
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const user = await this.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            role: schema_1.companyRoles.name,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email));
        if (!user || user.length === 0) {
            throw new common_1.BadRequestException('User does not exist.');
        }
        let inviteLink = '';
        if (user[0].role === 'employee') {
            inviteLink = `${this.configService.get('EMPLOYEE_PORTAL_URL')}/auth/reset-password/${token}`;
        }
        else {
            inviteLink = `${this.configService.get('CLIENT_URL')}/auth/reset-password/${token}`;
        }
        await this.passwordResetEmailService.sendPasswordResetEmail(email, user[0].firstName || 'User', inviteLink);
        const existingToken = await this.db
            .select()
            .from(schema_1.PasswordResetToken)
            .where((0, drizzle_orm_1.eq)(schema_1.PasswordResetToken.user_id, user[0].id));
        if (existingToken.length > 0) {
            await this.db
                .update(schema_1.PasswordResetToken)
                .set({
                token,
                expires_at,
                is_used: false,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.PasswordResetToken.user_id, user[0].id))
                .execute();
        }
        else {
            await this.db
                .insert(schema_1.PasswordResetToken)
                .values({
                user_id: user[0].id,
                token,
                expires_at,
                is_used: false,
            })
                .execute();
        }
        return token;
    }
    async resetPassword(token, password, ip) {
        const existingToken = await this.db
            .select()
            .from(schema_1.PasswordResetToken)
            .where((0, drizzle_orm_1.eq)(schema_1.PasswordResetToken.token, token));
        if (existingToken.length === 0) {
            throw new common_1.BadRequestException('Token is not valid.');
        }
        if (existingToken[0].is_used) {
            throw new common_1.BadRequestException('Token has already been used.');
        }
        if (existingToken[0].expires_at < new Date()) {
            throw new common_1.BadRequestException('Token has expired.');
        }
        const decoded = await this.jwtService.verify(token);
        const { email } = decoded;
        if (!email) {
            throw new common_1.BadRequestException('User does not exist.');
        }
        await this.db
            .update(schema_1.users)
            .set({
            password: await bcrypt.hash(password, 10),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .execute();
        await this.db
            .update(schema_1.PasswordResetToken)
            .set({ is_used: true })
            .where((0, drizzle_orm_1.eq)(schema_1.PasswordResetToken.token, token))
            .execute();
        await this.auditService.logAction({
            action: 'Password Reset',
            entity: 'Authentication',
            userId: existingToken[0].user_id,
            details: 'User password reset successfully',
            ipAddress: ip,
        });
        return {
            message: 'Password reset successful',
        };
    }
    async invitationPasswordReset(token, password) {
        const decoded = await this.jwtService.verify(token);
        const { email } = decoded;
        if (!email) {
            throw new common_1.BadRequestException('User does not exist.');
        }
        await this.db
            .update(schema_1.users)
            .set({
            password: await bcrypt.hash(password, 10),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .execute();
        return {
            message: 'Password reset successful',
        };
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, password_reset_service_1.PasswordResetEmailService,
        config_1.ConfigService,
        jwt_1.JwtService,
        audit_service_1.AuditService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map