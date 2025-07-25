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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../schema");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    constructor(config, db) {
        const secret = config.get('JWT_SECRET');
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                (request) => request?.cookies?.Authentication ||
                    request?.Authentication ||
                    request?.headers.Authentication,
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
        this.config = config;
        this.db = db;
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
            company_id: schema_1.users.companyId,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, payload.email));
        const user = usersArray[0];
        if (!user) {
            return new common_1.UnauthorizedException('Invalid token or user does not exist');
        }
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map