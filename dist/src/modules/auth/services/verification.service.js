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
exports.VerificationService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const email_verification_service_1 = require("../../notification/services/email-verification.service");
let VerificationService = class VerificationService {
    constructor(db, emailVerificationService) {
        this.db = db;
        this.emailVerificationService = emailVerificationService;
    }
    async generateVerificationToken(userId) {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const user = await this.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (user.length === 0) {
            throw new common_1.BadRequestException('User not found.');
        }
        const existingToken = await this.db
            .select()
            .from(schema_1.verificationToken)
            .where((0, drizzle_orm_1.eq)(schema_1.verificationToken.user_id, userId));
        if (existingToken.length > 0) {
            await this.db
                .update(schema_1.verificationToken)
                .set({ token, expires_at, is_used: false })
                .where((0, drizzle_orm_1.eq)(schema_1.verificationToken.user_id, userId))
                .execute();
        }
        else {
            await this.db
                .insert(schema_1.verificationToken)
                .values({
                user_id: userId,
                token,
                expires_at,
                is_used: false,
            })
                .execute();
        }
        await this.emailVerificationService.sendVerifyEmail(user[0].email, token);
        return token;
    }
    async verifyToken(dto) {
        const existingToken = await this.db
            .select()
            .from(schema_1.verificationToken)
            .where((0, drizzle_orm_1.eq)(schema_1.verificationToken.token, dto.token));
        if (existingToken.length === 0) {
            throw new common_1.BadRequestException('Token is not valid.');
        }
        if (existingToken[0].is_used) {
            throw new common_1.BadRequestException('Token has already been used.');
        }
        if (existingToken[0].expires_at < new Date()) {
            throw new common_1.BadRequestException('Token has expired.');
        }
        await this.db
            .update(schema_1.users)
            .set({ isVerified: true })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, existingToken[0].user_id))
            .execute();
        await this.db
            .update(schema_1.verificationToken)
            .set({ is_used: true })
            .where((0, drizzle_orm_1.eq)(schema_1.verificationToken.id, existingToken[0].id))
            .execute();
        return {
            success: true,
        };
    }
};
exports.VerificationService = VerificationService;
exports.VerificationService = VerificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, email_verification_service_1.EmailVerificationService])
], VerificationService);
//# sourceMappingURL=verification.service.js.map