"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationModule = void 0;
const common_1 = require("@nestjs/common");
const organization_controller_1 = require("./organization.controller");
const services_1 = require("./services");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const cache_module_1 = require("../config/cache/cache.module");
const cache_service_1 = require("../config/cache/cache.service");
const aws_service_1 = require("../config/aws/aws.service");
const services_2 = require("../auth/services");
const password_reset_service_1 = require("../notification/services/password-reset.service");
const jwt_1 = require("@nestjs/jwt");
const auth_module_1 = require("../auth/auth.module");
const onboarding_service_1 = require("./services/onboarding.service");
const email_queue_processor_1 = require("../notification/services/email-queue.processor");
const bullmq_1 = require("@nestjs/bullmq");
let OrganizationModule = class OrganizationModule {
};
exports.OrganizationModule = OrganizationModule;
exports.OrganizationModule = OrganizationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            drizzle_module_1.DrizzleModule,
            cache_module_1.CacheModule,
            platform_express_1.MulterModule.register({
                dest: './src/organization/temp',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
        ],
        controllers: [organization_controller_1.OrganizationController],
        providers: [
            jwt_guard_1.JwtGuard,
            services_1.CompanyService,
            services_1.EmployeeService,
            services_1.DepartmentService,
            cache_service_1.CacheService,
            aws_service_1.AwsService,
            services_2.PasswordResetService,
            password_reset_service_1.PasswordResetEmailService,
            jwt_1.JwtService,
            onboarding_service_1.OnboardingService,
            email_queue_processor_1.EmailQueueProcessor,
        ],
    })
], OrganizationModule);
//# sourceMappingURL=organization.module.js.map