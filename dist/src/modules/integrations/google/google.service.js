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
exports.GoogleService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const google_schema_1 = require("./schema/google.schema");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let GoogleService = class GoogleService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
        this.ttlSeconds = 60 * 60;
    }
    tags(companyId) {
        return [
            `company:${companyId}:integrations`,
            `company:${companyId}:integrations:google`,
        ];
    }
    async create(createGoogleDto, user) {
        const { id: userId, companyId } = user;
        const existing = await this.db
            .select()
            .from(google_schema_1.googleAccounts)
            .where((0, drizzle_orm_1.eq)(google_schema_1.googleAccounts.companyId, companyId))
            .execute();
        if (existing.length > 0) {
            const [updated] = await this.db
                .update(google_schema_1.googleAccounts)
                .set({
                accessToken: createGoogleDto.accessToken,
                refreshToken: createGoogleDto.refreshToken,
                tokenType: createGoogleDto.tokenType,
                scope: createGoogleDto.scope,
                expiryDate: createGoogleDto.expiryDate,
                refreshTokenExpiry: createGoogleDto.refreshTokenExpiry,
                googleEmail: createGoogleDto.googleEmail,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(google_schema_1.googleAccounts.companyId, companyId))
                .returning()
                .execute();
            await this.auditService.logAction({
                action: 'update',
                entity: 'google_integration',
                entityId: existing[0].id,
                details: `Updated Google integration for company #${companyId}`,
                userId,
                changes: {
                    ...createGoogleDto,
                    updatedAt: new Date(),
                },
            });
            await this.cache.bumpCompanyVersion(companyId);
            return updated;
        }
        else {
            const [inserted] = await this.db
                .insert(google_schema_1.googleAccounts)
                .values({
                ...createGoogleDto,
                companyId,
            })
                .returning()
                .execute();
            await this.auditService.logAction({
                action: 'create',
                entity: 'google_integration',
                entityId: inserted.id,
                details: `Created Google integration for company #${companyId}`,
                userId,
                changes: {
                    ...createGoogleDto,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            await this.cache.bumpCompanyVersion(companyId);
            return inserted;
        }
    }
    async findOne(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['integrations', 'google', 'account'], async () => {
            const result = await this.db
                .select()
                .from(google_schema_1.googleAccounts)
                .where((0, drizzle_orm_1.eq)(google_schema_1.googleAccounts.companyId, companyId))
                .execute();
            if (!result.length) {
                throw new common_1.NotFoundException(`Google integration for company #${companyId} not found`);
            }
            return result[0];
        }, { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) });
    }
    async update(user, updateGoogleDto) {
        const { companyId, id: userId } = user;
        const [updated] = await this.db
            .update(google_schema_1.googleAccounts)
            .set({
            ...updateGoogleDto,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(google_schema_1.googleAccounts.companyId, companyId))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException(`Google integration for company #${companyId} not found`);
        }
        await this.auditService.logAction({
            action: 'update',
            entity: 'google_integration',
            entityId: updated.id,
            details: `Updated Google integration for company #${companyId}`,
            userId: userId,
            changes: {
                ...updateGoogleDto,
                updatedAt: new Date(),
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
};
exports.GoogleService = GoogleService;
exports.GoogleService = GoogleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], GoogleService);
//# sourceMappingURL=google.service.js.map