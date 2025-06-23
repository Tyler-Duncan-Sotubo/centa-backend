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
exports.CertificationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const drizzle_orm_1 = require("drizzle-orm");
const certifications_schema_1 = require("../schema/certifications.schema");
let CertificationsService = class CertificationsService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
        this.table = certifications_schema_1.employeeCertifications;
    }
    async create(employeeId, dto, userId, ip) {
        const [created] = await this.db
            .insert(this.table)
            .values({ employeeId, ...dto })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'EmployeeCertification',
            details: 'Created new employee certification',
            userId,
            entityId: employeeId,
            ipAddress: ip,
            changes: { ...dto },
        });
        return created;
    }
    findAll(employeeId) {
        return this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.employeeId, employeeId))
            .execute();
    }
    async findOne(certificationId) {
        const [certification] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, certificationId))
            .execute();
        if (!certification) {
            return {};
        }
        return certification;
    }
    async update(certificationId, dto, userId, ip) {
        const [certification] = await this.db
            .select()
            .from(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, certificationId))
            .execute();
        if (!certification) {
            throw new common_1.NotFoundException(`Profile for employee ${certificationId} not found`);
        }
        if (certification) {
            const [updated] = await this.db
                .update(this.table)
                .set({ ...dto })
                .where((0, drizzle_orm_1.eq)(this.table.id, certificationId))
                .returning()
                .execute();
            const changes = {};
            for (const key of Object.keys(dto)) {
                const before = certification[key];
                const after = dto[key];
                if (before !== after) {
                    changes[key] = { before, after };
                }
            }
            if (Object.keys(changes).length) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'Employee certification',
                    details: 'Updated employee certification',
                    userId,
                    entityId: certificationId,
                    ipAddress: ip,
                    changes,
                });
            }
            return updated;
        }
    }
    async remove(certificationId) {
        const result = await this.db
            .delete(this.table)
            .where((0, drizzle_orm_1.eq)(this.table.id, certificationId))
            .returning({ id: this.table.id })
            .execute();
        if (!result.length) {
            throw new common_1.NotFoundException(`Profile for employee ${certificationId} not found`);
        }
        return { deleted: true, id: result[0].id };
    }
};
exports.CertificationsService = CertificationsService;
exports.CertificationsService = CertificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], CertificationsService);
//# sourceMappingURL=certifications.service.js.map