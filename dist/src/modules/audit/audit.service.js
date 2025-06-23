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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("./schema");
const schema_2 = require("../auth/schema");
const drizzle_orm_1 = require("drizzle-orm");
let AuditService = class AuditService {
    constructor(db) {
        this.db = db;
    }
    async logAction(params) {
        await this.db
            .insert(schema_1.auditLogs)
            .values({
            action: params.action,
            entity: params.entity,
            userId: params.userId,
            entityId: params.entityId,
            details: params.details,
            changes: params.changes,
            ipAddress: params.ipAddress,
            correlationId: params.correlationId,
        })
            .execute();
    }
    async bulkLogActions(entries) {
        if (!entries || entries.length === 0) {
            return;
        }
        await this.db
            .insert(schema_1.auditLogs)
            .values(entries.map((entry) => ({
            action: entry.action,
            entity: entry.entity,
            userId: entry.userId,
            entityId: entry.entityId,
            details: entry.details,
            changes: entry.changes,
            ipAddress: entry.ipAddress,
            correlationId: entry.correlationId,
        })))
            .execute();
    }
    async getAuditLogs(companyId) {
        return this.db
            .select({
            id: schema_1.auditLogs.id,
            timestamp: schema_1.auditLogs.timestamp,
            entity: schema_1.auditLogs.entity,
            entityId: schema_1.auditLogs.entityId,
            action: schema_1.auditLogs.action,
            details: schema_1.auditLogs.details,
            changes: schema_1.auditLogs.changes,
            ipAddress: schema_1.auditLogs.ipAddress,
            name: (0, drizzle_orm_1.sql) `${schema_2.users.firstName} || ' ' || ${schema_2.users.lastName}`,
            role: schema_2.companyRoles.name,
        })
            .from(schema_1.auditLogs)
            .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_2.users.id))
            .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_2.users.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.timestamp))
            .execute();
    }
    async getLoginAudit(companyId) {
        return this.db
            .select({
            id: schema_1.auditLogs.id,
            timestamp: schema_1.auditLogs.timestamp,
            entity: schema_1.auditLogs.entity,
            entityId: schema_1.auditLogs.entityId,
            action: schema_1.auditLogs.action,
            details: schema_1.auditLogs.details,
            changes: schema_1.auditLogs.changes,
            ipAddress: schema_1.auditLogs.ipAddress,
            name: (0, drizzle_orm_1.sql) `${schema_2.users.firstName} || ' ' || ${schema_2.users.lastName}`,
            role: schema_2.companyRoles.name,
        })
            .from(schema_1.auditLogs)
            .innerJoin(schema_2.users, (0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_2.users.id))
            .innerJoin(schema_2.companyRoles, (0, drizzle_orm_1.eq)(schema_2.users.companyRoleId, schema_2.companyRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.users.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.auditLogs.entity, 'Authentication')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.timestamp))
            .execute();
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AuditService);
//# sourceMappingURL=audit.service.js.map