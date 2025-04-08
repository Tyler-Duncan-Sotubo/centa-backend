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
const audit_service_1 = require("../../audit/audit.service");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
let AuthService = class AuthService {
    constructor(userService, tokenGeneratorService, auditService, db) {
        this.userService = userService;
        this.tokenGeneratorService = tokenGeneratorService;
        this.auditService = auditService;
        this.db = db;
    }
    async login(payload, response) {
        const user = await this.validateUser(payload.email, payload.password);
        const updatedUser = await this.db
            .update(users_schema_1.users)
            .set({ last_login: new Date() })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, payload.email.toLowerCase()))
            .returning({
            id: users_schema_1.users.id,
            email: users_schema_1.users.email,
            first_name: users_schema_1.users.first_name,
            last_name: users_schema_1.users.last_name,
            company_id: users_schema_1.users.company_id,
        })
            .execute();
        if (user.role !== 'super_admin' &&
            user.role !== 'admin' &&
            user.role !== 'hr_manager') {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        await this.auditService.logAction('Login', 'Authentication', user.id);
        const { accessToken, refreshToken } = await this.tokenGeneratorService.generateToken(user);
        const { password, last_login, role, created_at, ...userWithoutPassword } = user;
        try {
            if (userWithoutPassword) {
                response.cookie('Authentication', accessToken, {
                    httpOnly: true,
                    secure: true,
                    expires: new Date(Date.now() + 6 * 60 * 60 * 1000),
                    sameSite: 'none',
                });
                response.setHeader('Authorization', `Bearer ${accessToken}`);
                response.setHeader('X-Refresh-Token', refreshToken);
                response.json({
                    success: true,
                    message: 'Login successful',
                    user: updatedUser[0],
                    backendTokens: {
                        accessToken,
                        refreshToken,
                    },
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
    async employeeLogin(payload, response) {
        const user = await this.validateUser(payload.email, payload.password);
        await this.db
            .update(users_schema_1.users)
            .set({ last_login: new Date() })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, payload.email.toLowerCase()))
            .returning({
            id: users_schema_1.users.id,
            email: users_schema_1.users.email,
            first_name: users_schema_1.users.first_name,
            last_name: users_schema_1.users.last_name,
            company_id: users_schema_1.users.company_id,
        })
            .execute();
        if (user.role !== 'employee') {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        await this.auditService.logAction('Login', 'Authentication', user.id);
        const { accessToken, refreshToken } = await this.tokenGeneratorService.generateToken(user);
        const employee = await this.db
            .select({
            id: employee_schema_1.employees.id,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            email: users_schema_1.users.email,
            company_id: company_schema_1.companies.id,
            company_name: company_schema_1.companies.name,
            job_title: employee_schema_1.employees.job_title,
            annual_gross: employee_schema_1.employees.annual_gross,
            group_id: employee_schema_1.employees.group_id,
            apply_nhf: employee_schema_1.employees.apply_nhf,
            avatar: users_schema_1.users.avatar,
        })
            .from(employee_schema_1.employees)
            .innerJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(users_schema_1.users.id, employee_schema_1.employees.user_id))
            .innerJoin(company_schema_1.companies, (0, drizzle_orm_1.eq)(company_schema_1.companies.id, employee_schema_1.employees.company_id))
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.user_id, user.id));
        try {
            if (employee) {
                response.json({
                    success: true,
                    message: 'Login successful',
                    user: employee[0],
                    backendTokens: {
                        accessToken,
                        refreshToken,
                    },
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
    async refreshToken(user, response) {
        const payload = {
            email: user.email,
            sub: user.sub,
        };
        const EXPIRE_TIME = 1000 * 60 * 60 * 24;
        const { accessToken, refreshToken } = await this.tokenGeneratorService.generateToken(payload);
        response.cookie('Authentication', accessToken, {
            httpOnly: true,
            secure: true,
            expires: new Date(Date.now() + 60),
            sameSite: 'none',
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: new Date().setTime(new Date().getTime() + EXPIRE_TIME),
        };
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
            sameSite: 'none',
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
        audit_service_1.AuditService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map