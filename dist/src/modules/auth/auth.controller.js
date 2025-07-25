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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const services_1 = require("./services");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorator/current-user.decorator");
const error_interceptor_1 = require("../../common/interceptor/error-interceptor");
const invite_user_dto_1 = require("./dto/invite-user.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const audit_interceptor_1 = require("../audit/audit.interceptor");
const audit_decorator_1 = require("../audit/audit.decorator");
const refresh_guard_1 = require("./guards/refresh.guard");
const register_user_dto_1 = require("./dto/register-user.dto");
const login_verification_service_1 = require("./services/login-verification.service");
let AuthController = class AuthController {
    constructor(auth, user, token, verification, password, loginVerification) {
        this.auth = auth;
        this.user = user;
        this.token = token;
        this.verification = verification;
        this.password = password;
        this.loginVerification = loginVerification;
    }
    async Register(dto) {
        return this.user.register(dto);
    }
    async Invite(dto, user) {
        return this.user.inviteUser(dto, user.companyId);
    }
    async AcceptInvite(token) {
        return this.user.verifyInvite(token);
    }
    async EditUserRole(dto, id) {
        return this.user.editUserRole(id, dto);
    }
    async login(dto, res, ip) {
        const result = await this.auth.login(dto, ['super_admin', 'admin', 'hr_manager'], ip);
        if ('status' in result) {
            return result;
        }
        const { user, backendTokens, permissions } = result;
        res.cookie('Authentication', backendTokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        return {
            success: true,
            message: 'Login successful',
            user,
            backendTokens,
            permissions,
        };
    }
    async employeeLogin(dto, res, ip) {
        const result = await this.auth.login(dto, ['employee', 'manager'], ip);
        if ('status' in result) {
            return result;
        }
        const { user, backendTokens, permissions } = result;
        res.cookie('Authentication', backendTokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        return {
            success: true,
            message: 'Login successful',
            user,
            backendTokens,
            permissions,
        };
    }
    async refreshToken(user) {
        return await this.auth.refreshToken(user);
    }
    async Logout(response) {
        return this.auth.logout(response);
    }
    async GetUser(user) {
        return user;
    }
    async GetCompanyUsers(user) {
        return this.user.companyUsers(user.companyId);
    }
    async resendVerificationEmail(user) {
        return this.verification.generateVerificationToken(user.id);
    }
    async verifyEmail(dto) {
        return await this.verification.verifyToken(dto);
    }
    async passwordReset(dto) {
        return this.password.generatePasswordResetToken(dto.email);
    }
    async resetPassword(token, dto, ip) {
        return this.password.resetPassword(dto.token, dto.password, ip);
    }
    async resetInvitationPassword(token, dto) {
        return this.password.invitationPasswordReset(token, dto.password);
    }
    async UpdateProfile(user, dto) {
        return this.user.UpdateUserProfile(user.id, dto);
    }
    async GetUserProfile(user) {
        return this.user.getUserProfile(user.id);
    }
    async verifyLogin(dto, res, ip) {
        const result = await this.auth.verifyCode(dto.tempToken, dto.code, ip);
        const { user, backendTokens, permissions } = result;
        res.cookie('Authentication', backendTokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        return {
            success: true,
            message: 'Login successful',
            user,
            backendTokens,
            permissions,
        };
    }
    async resendCode(token) {
        return this.loginVerification.regenerateVerificationToken(token);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, audit_decorator_1.Audit)({ action: 'Register', entity: 'Authentication' }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_user_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "Register", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('invite'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin']),
    (0, audit_decorator_1.Audit)({ action: 'New User Invite', entity: 'User' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_user_dto_1.InviteUserDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "Invite", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('invite/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "AcceptInvite", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, audit_decorator_1.Audit)({ action: 'Updated User Role', entity: 'User' }),
    (0, common_1.Patch)('edit-user-role/:id'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invite_user_dto_1.InviteUserDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "EditUserRole", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('employee-login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "employeeLogin", null);
__decorate([
    (0, common_1.UseGuards)(refresh_guard_1.RefreshJwtGuard),
    (0, common_1.Post)('refresh'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "Logout", null);
__decorate([
    (0, common_1.Get)('user'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "GetUser", null);
__decorate([
    (0, common_1.Get)('company-users'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "GetCompanyUsers", null);
__decorate([
    (0, common_1.Post)('resend-verification-email'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerificationEmail", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('password-reset'),
    (0, audit_decorator_1.Audit)({ action: 'Password Reset Request', entity: 'User' }),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RequestPasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "passwordReset", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('reset-password'),
    (0, audit_decorator_1.Audit)({ action: 'Reset Password', entity: 'User' }),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.PasswordResetDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Post)('invite-password-reset/:token'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.PasswordResetDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetInvitationPassword", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Patch)('profile'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "UpdateProfile", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.Get)('profile'),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "GetUserProfile", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('verify-code'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.VerifyLoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyLogin", null);
__decorate([
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)(error_interceptor_1.ResponseInterceptor),
    (0, common_1.Post)('resend-code'),
    __param(0, (0, common_1.Body)('tempToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendCode", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [services_1.AuthService,
        services_1.UserService,
        services_1.TokenGeneratorService,
        services_1.VerificationService,
        services_1.PasswordResetService,
        login_verification_service_1.LoginVerificationService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map