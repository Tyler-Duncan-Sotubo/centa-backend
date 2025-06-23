"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./auth.controller");
const config_1 = require("@nestjs/config");
const services_1 = require("./services");
const jwt_1 = require("@nestjs/jwt");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const primary_guard_1 = require("./guards/primary.guard");
const aws_service_1 = require("../../common/aws/aws.service");
const audit_service_1 = require("../audit/audit.service");
const login_verification_service_1 = require("./services/login-verification.service");
const permissions_module_1 = require("./permissions/permissions.module");
const permissions_service_1 = require("./permissions/permissions.service");
const bullmq_1 = require("@nestjs/bullmq");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'permission-seed-queue',
            }),
            jwt_1.JwtModule.registerAsync({
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: `${configService.get('JWT_EXPIRATION')}s`,
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            permissions_module_1.PermissionsModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            services_1.UserService,
            services_1.TokenGeneratorService,
            services_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            services_1.VerificationService,
            services_1.PasswordResetService,
            primary_guard_1.PrimaryGuard,
            config_1.ConfigService,
            aws_service_1.AwsService,
            audit_service_1.AuditService,
            login_verification_service_1.LoginVerificationService,
            permissions_service_1.PermissionsService,
        ],
        exports: [
            services_1.UserService,
            services_1.TokenGeneratorService,
            services_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            services_1.VerificationService,
            services_1.PasswordResetService,
            primary_guard_1.PrimaryGuard,
            permissions_service_1.PermissionsService,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map