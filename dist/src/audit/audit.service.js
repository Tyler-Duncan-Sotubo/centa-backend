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
const drizzle_module_1 = require("../drizzle/drizzle.module");
const audit_schema_1 = require("../drizzle/schema/audit.schema");
const drizzle_orm_1 = require("drizzle-orm");
const users_schema_1 = require("../drizzle/schema/users.schema");
let AuditService = class AuditService {
    constructor(db) {
        this.db = db;
    }
    async logAction(action, entity, userId) {
        await this.db.insert(audit_schema_1.auditLog).values({
            action,
            entity,
            userId: userId,
        });
    }
    async getAuditLogs(company_id) {
        const logs = await this.db
            .select({
            id: audit_schema_1.auditLog.id,
            action: audit_schema_1.auditLog.action,
            entity: audit_schema_1.auditLog.entity,
            createdAt: audit_schema_1.auditLog.createdAt,
            changedBy: users_schema_1.users.first_name,
            role: users_schema_1.users.role,
        })
            .from(audit_schema_1.auditLog)
            .leftJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(audit_schema_1.auditLog.userId, users_schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.company_id, company_id))
            .orderBy((0, drizzle_orm_1.desc)(audit_schema_1.auditLog.createdAt));
        return logs;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AuditService);
//# sourceMappingURL=audit.service.js.map