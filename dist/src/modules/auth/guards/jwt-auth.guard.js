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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const primary_guard_1 = require("./primary.guard");
const fs = require("fs");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    constructor(reflector, jwtGuard) {
        this.reflector = reflector;
        this.jwtGuard = jwtGuard;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    async canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        try {
            const isAuthenticated = await this.jwtGuard.canActivate(context);
            if (!isAuthenticated)
                return false;
        }
        catch (error) {
            this.logger.error(error.message);
            this.handleUnauthorized(request, error.message);
        }
        const user = request.user;
        if (!user) {
            this.handleUnauthorized(request, 'User does not exist');
        }
        const requiredPermissions = this.reflector.get('permissions', context.getHandler()) || [];
        if (requiredPermissions.length > 0) {
            const hasPermission = requiredPermissions.every((perm) => user?.permissions.includes(perm));
            if (!hasPermission) {
                this.handleUnauthorized(request, `You don't have permission to perform this action.`);
            }
        }
        return true;
    }
    handleUnauthorized(request, error) {
        const errorResponse = {
            status: 'error',
            error: { message: error },
        };
        const errorLog = this.logError(errorResponse, request);
        this.writeErrorLogToFile(errorLog);
        throw new common_1.HttpException(errorResponse, 401);
    }
    logError(errorResponse, request) {
        return `URL: '${request.url}'\nMethod: ${request.method}\nTimestamp: '${new Date().toISOString()}'\nError Message: ${errorResponse.error.message}\n\n`;
    }
    writeErrorLogToFile(errorLog) {
        fs.appendFile('error.log', errorLog, (err) => {
            if (err)
                console.error('Failed to write error log:', err);
        });
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        primary_guard_1.PrimaryGuard])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map