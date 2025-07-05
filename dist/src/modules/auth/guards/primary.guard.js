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
exports.PrimaryGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
const permissions_service_1 = require("../permissions/permissions.service");
let PrimaryGuard = class PrimaryGuard {
    constructor(jwtService, configService, db, permissionsService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.db = db;
        this.permissionsService = permissionsService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token)
            throw new common_1.UnauthorizedException();
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const user = await this.validate(payload);
            request['user'] = user;
        }
        catch {
            throw new common_1.UnauthorizedException();
        }
        return true;
    }
    extractTokenFromHeader(request) {
        const headers = request.headers || request.raw?.headers || {};
        const authHeader = headers.authorization || headers.Authorization;
        if (!authHeader)
            return undefined;
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
    async validate(payload) {
        const usersArray = await this.db
            .select({
            email: schema_1.users.email,
            id: schema_1.users.id,
            role: schema_1.companyRoles.name,
            last_login: schema_1.users.lastLogin,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            companyId: schema_1.users.companyId,
            roleId: schema_1.companyRoles.id,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, payload.email));
        const user = usersArray[0];
        if (!user) {
            return new common_1.UnauthorizedException('Invalid token or user does not exist');
        }
        const permissionKeys = await this.permissionsService.getPermissionKeysForUser(user.roleId);
        return {
            ...user,
            permissions: permissionKeys,
        };
    }
};
exports.PrimaryGuard = PrimaryGuard;
exports.PrimaryGuard = PrimaryGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService, Object, permissions_service_1.PermissionsService])
], PrimaryGuard);
//# sourceMappingURL=primary.guard.js.map