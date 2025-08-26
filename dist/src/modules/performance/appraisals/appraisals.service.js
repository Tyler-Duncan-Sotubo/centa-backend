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
exports.AppraisalsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const performance_appraisals_schema_1 = require("./schema/performance-appraisals.schema");
const schema_1 = require("../../../drizzle/schema");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const uuid_1 = require("uuid");
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_appraisals_entries_schema_1 = require("./schema/performance-appraisals-entries.schema");
const performance_appraisal_cycle_schema_1 = require("./schema/performance-appraisal-cycle.schema");
let AppraisalsService = class AppraisalsService {
    constructor(db, auditService, companySettingsService) {
        this.db = db;
        this.auditService = auditService;
        this.companySettingsService = companySettingsService;
    }
    async create(createDto, companyId, userId) {
        const [employee] = await this.db
            .select({ managerId: schema_1.employees.managerId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, createDto.employeeId));
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${createDto.employeeId} not found`);
        }
        let managerId = employee.managerId;
        if (!managerId) {
            const { defaultManager } = await this.companySettingsService.getDefaultManager(companyId);
            if (!defaultManager) {
                throw new common_1.BadRequestException(`No manager assigned to employee ${createDto.employeeId} and no default manager configured in company settings`);
            }
            managerId = defaultManager;
        }
        if (!managerId || !(0, uuid_1.validate)(managerId)) {
            managerId = 'b81c481b-a849-4a25-a310-b0e53818a8cf';
        }
        const existing = await this.db
            .select()
            .from(performance_appraisals_schema_1.appraisals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, createDto.employeeId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, createDto.cycleId)));
        if (existing.length > 0) {
            throw new common_1.BadRequestException('An appraisal already exists for this employee in the cycle');
        }
        const [created] = await this.db
            .insert(performance_appraisals_schema_1.appraisals)
            .values({
            ...createDto,
            companyId,
            managerId,
        })
            .returning();
        if (userId) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_appraisal',
                entityId: created.id,
                userId,
                details: `Created appraisal for employee ${created.employeeId}`,
                changes: {
                    ...createDto,
                    managerId,
                },
            });
        }
        return created;
    }
    async findAll(companyId, cycleId) {
        const emp = (0, pg_core_1.alias)(schema_1.employees, 'emp');
        const mgr = (0, pg_core_1.alias)(schema_1.employees, 'mgr');
        return this.db
            .select({
            id: performance_appraisals_schema_1.appraisals.id,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${emp.firstName}, ' ', ${emp.lastName})`,
            managerName: (0, drizzle_orm_1.sql) `CONCAT(${mgr.firstName}, ' ', ${mgr.lastName})`,
            submittedByEmployee: performance_appraisals_schema_1.appraisals.submittedByEmployee,
            submittedByManager: performance_appraisals_schema_1.appraisals.submittedByManager,
            finalized: performance_appraisals_schema_1.appraisals.finalized,
            finalScore: performance_appraisals_schema_1.appraisals.finalScore,
            departmentName: schema_1.departments.name,
            jobRoleName: schema_1.jobRoles.title,
        })
            .from(performance_appraisals_schema_1.appraisals)
            .leftJoin(emp, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, emp.id))
            .leftJoin(mgr, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.managerId, mgr.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(emp.departmentId, schema_1.departments.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(emp.jobRoleId, schema_1.jobRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, cycleId)))
            .orderBy((0, drizzle_orm_1.desc)(performance_appraisals_schema_1.appraisals.createdAt));
    }
    async findDashboardForEmployee(companyId, employeeId) {
        const [activeCycle] = await this.db
            .select({
            id: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id,
            name: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
            startDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.startDate,
            endDate: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.endDate,
            status: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status,
        })
            .from(performance_appraisal_cycle_schema_1.performanceAppraisalCycles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.companyId, companyId), (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.status, 'active')))
            .limit(1);
        const emp = (0, pg_core_1.alias)(schema_1.employees, 'emp');
        const mgr = (0, pg_core_1.alias)(schema_1.employees, 'mgr');
        const rows = await this.db
            .select({
            id: performance_appraisals_schema_1.appraisals.id,
            cycleId: performance_appraisals_schema_1.appraisals.cycleId,
            cycleName: performance_appraisal_cycle_schema_1.performanceAppraisalCycles.name,
            createdAt: performance_appraisals_schema_1.appraisals.createdAt,
            submittedByEmployee: performance_appraisals_schema_1.appraisals.submittedByEmployee,
            submittedByManager: performance_appraisals_schema_1.appraisals.submittedByManager,
            finalized: performance_appraisals_schema_1.appraisals.finalized,
            finalScore: performance_appraisals_schema_1.appraisals.finalScore,
            employeeName: (0, drizzle_orm_1.sql) `concat(${emp.firstName}, ' ', ${emp.lastName})`,
            managerName: (0, drizzle_orm_1.sql) `concat(${mgr.firstName}, ' ', ${mgr.lastName})`,
            departmentName: schema_1.departments.name,
            jobRoleName: schema_1.jobRoles.title,
        })
            .from(performance_appraisals_schema_1.appraisals)
            .leftJoin(performance_appraisal_cycle_schema_1.performanceAppraisalCycles, (0, drizzle_orm_1.eq)(performance_appraisal_cycle_schema_1.performanceAppraisalCycles.id, performance_appraisals_schema_1.appraisals.cycleId))
            .leftJoin(emp, (0, drizzle_orm_1.eq)(emp.id, performance_appraisals_schema_1.appraisals.employeeId))
            .leftJoin(mgr, (0, drizzle_orm_1.eq)(mgr.id, performance_appraisals_schema_1.appraisals.managerId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, emp.departmentId))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, emp.jobRoleId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, employeeId)))
            .orderBy((0, drizzle_orm_1.desc)(performance_appraisals_schema_1.appraisals.createdAt));
        let currentCycleAppraisal = null;
        if (activeCycle) {
            const [curr] = await this.db
                .select({
                id: performance_appraisals_schema_1.appraisals.id,
                submittedByEmployee: performance_appraisals_schema_1.appraisals.submittedByEmployee,
                submittedByManager: performance_appraisals_schema_1.appraisals.submittedByManager,
                finalized: performance_appraisals_schema_1.appraisals.finalized,
                finalScore: performance_appraisals_schema_1.appraisals.finalScore,
            })
                .from(performance_appraisals_schema_1.appraisals)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, employeeId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.cycleId, activeCycle.id)))
                .limit(1);
            currentCycleAppraisal = curr ?? null;
        }
        return {
            currentCycle: activeCycle
                ? {
                    id: activeCycle.id,
                    name: activeCycle.name,
                    startDate: activeCycle.startDate,
                    endDate: activeCycle.endDate,
                    status: activeCycle.status,
                }
                : null,
            currentCycleAppraisal,
            history: rows.map((r) => ({
                id: r.id,
                cycleId: r.cycleId,
                cycleName: r.cycleName ?? null,
                createdAt: r.createdAt,
                submittedByEmployee: r.submittedByEmployee,
                submittedByManager: r.submittedByManager,
                finalized: r.finalized,
                finalScore: r.finalScore,
                employeeName: r.employeeName,
                managerName: r.managerName ?? null,
                departmentName: r.departmentName ?? null,
                jobRoleName: r.jobRoleName ?? null,
            })),
        };
    }
    async findOne(id, companyId) {
        const emp = (0, pg_core_1.alias)(schema_1.employees, 'emp');
        const mgr = (0, pg_core_1.alias)(schema_1.employees, 'mgr');
        const [record] = await this.db
            .select({
            id: performance_appraisals_schema_1.appraisals.id,
            cycleId: performance_appraisals_schema_1.appraisals.cycleId,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${emp.firstName}, ' ', ${emp.lastName})`,
            managerName: (0, drizzle_orm_1.sql) `CONCAT(${mgr.firstName}, ' ', ${mgr.lastName})`,
            submittedByEmployee: performance_appraisals_schema_1.appraisals.submittedByEmployee,
            submittedByManager: performance_appraisals_schema_1.appraisals.submittedByManager,
            finalized: performance_appraisals_schema_1.appraisals.finalized,
            recommendation: performance_appraisals_schema_1.appraisals.promotionRecommendation,
            finalNote: performance_appraisals_schema_1.appraisals.finalNote,
            finalScore: performance_appraisals_schema_1.appraisals.finalScore,
            departmentName: schema_1.departments.name,
            jobRoleName: schema_1.jobRoles.title,
        })
            .from(performance_appraisals_schema_1.appraisals)
            .leftJoin(emp, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.employeeId, emp.id))
            .leftJoin(mgr, (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.managerId, mgr.id))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(emp.departmentId, schema_1.departments.id))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(emp.jobRoleId, schema_1.jobRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, id)))
            .orderBy((0, drizzle_orm_1.desc)(performance_appraisals_schema_1.appraisals.createdAt));
        if (!record) {
            throw new common_1.NotFoundException(`Appraisal with ID ${id} not found`);
        }
        console.log('Fetched Appraisal Record:', record);
        return record;
    }
    async updateManager(appraisalId, newManagerId, user) {
        const { id: userId, companyId } = user;
        const [appraisal] = await this.db
            .select()
            .from(performance_appraisals_schema_1.appraisals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, companyId)));
        if (!appraisal) {
            throw new common_1.NotFoundException(`Appraisal with ID ${appraisalId} not found`);
        }
        const [updated] = await this.db
            .update(performance_appraisals_schema_1.appraisals)
            .set({ managerId: newManagerId })
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId))
            .returning();
        if (userId) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'performance_appraisal',
                entityId: appraisalId,
                userId,
                details: `Updated manager for appraisal ${appraisalId}`,
                changes: {
                    previousManagerId: appraisal.managerId,
                    newManagerId,
                },
            });
        }
        return updated;
    }
    async update(id, updateDto, user) {
        await this.findOne(id, user.companyId);
        const [updated] = await this.db
            .update(performance_appraisals_schema_1.appraisals)
            .set(updateDto)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, id), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, user.companyId)))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'performance_appraisal',
            entityId: id,
            userId: user.id,
            details: `Updated appraisal ${id}`,
            changes: {
                ...updateDto,
                updatedAt: new Date().toISOString(),
            },
        });
        return updated;
    }
    async remove(id, user) {
        const appraisal = await this.findOne(id, user.companyId);
        const isStarted = appraisal.submittedByEmployee ||
            appraisal.submittedByManager ||
            appraisal.finalized;
        if (isStarted) {
            throw new common_1.BadRequestException('Cannot delete appraisal that has already been started or finalized');
        }
        await this.db
            .delete(performance_appraisals_schema_1.appraisals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, id), (0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.companyId, user.companyId)));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'performance_appraisal',
            entityId: id,
            userId: user.id,
            details: `Deleted not-started appraisal ${id}`,
            changes: { deletedAt: new Date().toISOString() },
        });
        return { message: 'Appraisal deleted successfully' };
    }
    async restartAppraisal(appraisalId, user) {
        const existing = await this.db
            .select({ id: performance_appraisals_schema_1.appraisals.id, companyId: performance_appraisals_schema_1.appraisals.companyId })
            .from(performance_appraisals_schema_1.appraisals)
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId));
        if (existing.length === 0) {
            throw new common_1.NotFoundException('Appraisal not found');
        }
        await this.db
            .delete(performance_appraisals_entries_schema_1.appraisalEntries)
            .where((0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.appraisalId, appraisalId));
        await this.db
            .update(performance_appraisals_schema_1.appraisals)
            .set({
            submittedByEmployee: false,
            submittedByManager: false,
            finalized: false,
            finalScore: null,
        })
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId));
        await this.auditService.logAction({
            action: 'RESTART_APPRAISAL',
            entityId: appraisalId,
            entity: 'performance_appraisal',
            userId: user.id,
            details: `Restarted appraisal ${appraisalId}`,
            changes: { resetAt: new Date().toISOString() },
        });
        return { message: 'Appraisal restarted successfully' };
    }
};
exports.AppraisalsService = AppraisalsService;
exports.AppraisalsService = AppraisalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], AppraisalsService);
//# sourceMappingURL=appraisals.service.js.map