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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const bcrypt = require("bcryptjs");
const token_generator_service_1 = require("./token-generator.service");
const users_schema_1 = require("../../drizzle/schema/users.schema");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const password_reset_service_1 = require("./password-reset.service");
let AuthService = class AuthService {
    constructor(userService, tokenGeneratorService, passwordResetService, db) {
        this.userService = userService;
        this.tokenGeneratorService = tokenGeneratorService;
        this.passwordResetService = passwordResetService;
        this.db = db;
    }
    async login(payload, response) {
        const user = await this.validateUser(payload.email, payload.password);
        await this.db
            .update(users_schema_1.users)
            .set({ last_login: new Date() })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, payload.email.toLowerCase()))
            .execute();
        const { access_token, refresh_token } = await this.tokenGeneratorService.generateToken(user);
        const { password, last_login, ...userWithoutPassword } = user;
        try {
            if (userWithoutPassword) {
                response.cookie('Authentication', refresh_token, {
                    httpOnly: true,
                    secure: true,
                    expires: new Date(Date.now() + 6 * 60 * 60 * 1000),
                    sameSite: 'lax',
                });
                response.setHeader('Authorization', `Bearer ${access_token}`);
                response.setHeader('X-Refresh-Token', refresh_token);
                response.json({
                    success: true,
                    message: 'Login successful',
                    user: user,
                    token: access_token,
                });
            }
            else {
                throw new common_1.BadRequestException('Invalid credentials');
            }
        }
        catch (error) {
            response.json({
                success: false,
                message: error.message,
            });
        }
    }
    async validateUser(email, password) {
        const user = await this.userService.findUserByEmail(email.toLowerCase());
        if (!user) {
            throw new common_1.NotFoundException('Invalid email or password');
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        return user;
    }
    async logout(response) {
        response.clearCookie('Authentication', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });
        response.json({
            success: true,
            message: 'Logout successful',
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [user_service_1.UserService,
        token_generator_service_1.TokenGeneratorService,
        password_reset_service_1.PasswordResetService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map