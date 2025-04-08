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
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const users_schema_1 = require("../../drizzle/schema/users.schema");
const drizzle_orm_1 = require("drizzle-orm");
let PrimaryGuard = class PrimaryGuard {
    constructor(jwtService, configService, db) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.db = db;
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
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
    async validate(payload) {
        const usersArray = await this.db
            .select({
            email: users_schema_1.users.email,
            id: users_schema_1.users.id,
            role: users_schema_1.users.role,
            last_login: users_schema_1.users.last_login,
            firstName: users_schema_1.users.first_name,
            lastName: users_schema_1.users.last_name,
            company_id: users_schema_1.users.company_id,
        })
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, payload.email));
        const user = usersArray[0];
        if (!user) {
            return new common_1.UnauthorizedException('Invalid token or user does not exist');
        }
        return user;
    }
};
exports.PrimaryGuard = PrimaryGuard;
exports.PrimaryGuard = PrimaryGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService, Object])
], PrimaryGuard);
//# sourceMappingURL=primary.guard.js.map