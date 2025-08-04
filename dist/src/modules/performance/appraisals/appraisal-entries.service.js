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
exports.AppraisalEntriesService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_appraisals_schema_1 = require("./schema/performance-appraisals.schema");
const schema_1 = require("../../../drizzle/schema");
const performance_appraisals_entries_schema_1 = require("./schema/performance-appraisals-entries.schema");
const performance_appraisal_cycle_schema_1 = require("./schema/performance-appraisal-cycle.schema");
let AppraisalEntriesService = class AppraisalEntriesService {
    constructor(db) {
        this.db = db;
    }
    async getAppraisalEntriesWithExpectations(appraisalId) {
        const [appraisal] = await this.db
            .select({ employeeId: performance_appraisals_schema_1.appraisals.employeeId })
            .from(performance_appraisals_schema_1.appraisals)
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId))
            .limit(1)
            .execute();
        if (!appraisal)
            throw new common_1.NotFoundException('Appraisal not found');
        const [employee] = await this.db
            .select({ roleId: schema_1.employees.jobRoleId, roleName: schema_1.jobRoles.title })
            .from(schema_1.employees)
            .innerJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.employees.jobRoleId, schema_1.jobRoles.id))
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, appraisal.employeeId))
            .limit(1)
            .execute();
        if (!employee || !employee.roleId) {
            throw new common_1.NotFoundException('Employee role not assigned');
        }
        const expectations = await this.db
            .select({
            competencyId: schema_1.roleCompetencyExpectations.competencyId,
            expectedLevelId: schema_1.roleCompetencyExpectations.expectedLevelId,
            competencyName: schema_1.performanceCompetencies.name,
            expectedLevelName: schema_1.competencyLevels.name,
        })
            .from(schema_1.roleCompetencyExpectations)
            .innerJoin(schema_1.performanceCompetencies, (0, drizzle_orm_1.eq)(schema_1.roleCompetencyExpectations.competencyId, schema_1.performanceCompetencies.id))
            .innerJoin(schema_1.competencyLevels, (0, drizzle_orm_1.eq)(schema_1.roleCompetencyExpectations.expectedLevelId, schema_1.competencyLevels.id))
            .where((0, drizzle_orm_1.eq)(schema_1.roleCompetencyExpectations.roleId, employee.roleId));
        const entries = await this.db
            .select({
            competencyId: performance_appraisals_entries_schema_1.appraisalEntries.competencyId,
            employeeLevelId: performance_appraisals_entries_schema_1.appraisalEntries.employeeLevelId,
            managerLevelId: performance_appraisals_entries_schema_1.appraisalEntries.managerLevelId,
            notes: performance_appraisals_entries_schema_1.appraisalEntries.notes,
        })
            .from(performance_appraisals_entries_schema_1.appraisalEntries)
            .where((0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.appraisalId, appraisalId));
        const levelIds = new Set();
        for (const entry of entries) {
            if (entry.employeeLevelId)
                levelIds.add(entry.employeeLevelId);
            if (entry.managerLevelId)
                levelIds.add(entry.managerLevelId);
        }
        const levelList = await this.db
            .select({
            id: schema_1.competencyLevels.id,
            name: schema_1.competencyLevels.name,
        })
            .from(schema_1.competencyLevels)
            .where((0, drizzle_orm_1.inArray)(schema_1.competencyLevels.id, Array.from(levelIds)));
        const levelMap = new Map(levelList.map((lvl) => [lvl.id, lvl.name]));
        const entriesMap = new Map(entries.map((e) => [e.competencyId, e]));
        return expectations.map((exp) => {
            const entry = entriesMap.get(exp.competencyId);
            const employeeLevelId = entry?.employeeLevelId ?? null;
            const managerLevelId = entry?.managerLevelId ?? null;
            return {
                competencyId: exp.competencyId,
                competencyName: exp.competencyName,
                expectedLevelId: exp.expectedLevelId,
                expectedLevelName: exp.expectedLevelName,
                employeeLevelId,
                employeeLevelName: employeeLevelId
                    ? (levelMap.get(employeeLevelId) ?? null)
                    : null,
                managerLevelId,
                managerLevelName: managerLevelId
                    ? (levelMap.get(managerLevelId) ?? null)
                    : null,
                notes: entry?.notes ?? '',
            };
        });
    }
    async upsertEntry(dto, appraisalId, user) {
        const existing = await this.db
            .select()
            .from(performance_appraisals_entries_schema_1.appraisalEntries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.appraisalId, appraisalId), (0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.competencyId, dto.competencyId)))
            .execute();
        if (existing.length > 0) {
            const [updated] = await this.db
                .update(performance_appraisals_entries_schema_1.appraisalEntries)
                .set({
                employeeLevelId: dto.employeeLevelId ?? null,
                managerLevelId: dto.managerLevelId ?? null,
                notes: dto.notes ?? null,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.appraisalId, appraisalId), (0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.competencyId, dto.competencyId)))
                .returning();
            return { message: 'Entry updated', data: updated, user };
        }
        const [created] = await this.db
            .insert(performance_appraisals_entries_schema_1.appraisalEntries)
            .values({
            appraisalId,
            competencyId: dto.competencyId,
            expectedLevelId: dto.expectedLevelId,
            employeeLevelId: dto.employeeLevelId ?? null,
            managerLevelId: dto.managerLevelId ?? null,
            notes: dto.notes ?? null,
        })
            .returning();
        await this.db
            .update(performance_appraisals_schema_1.appraisals)
            .set({
            submittedByEmployee: dto.employeeLevelId ? true : false,
            submittedByManager: dto.managerLevelId ? true : false,
            finalized: dto.employeeLevelId && dto.managerLevelId ? true : false,
        })
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId));
        return { message: 'Entry created', data: created };
    }
    async upsertEntries(appraisalId, entries, user) {
        const results = [];
        for (const entry of entries) {
            const result = await this.upsertEntry(entry, appraisalId, user);
            results.push(result);
        }
        await this.recalculateAppraisalStatus(appraisalId);
        return {
            message: 'Batch upsert complete',
            count: results.length,
            results,
        };
    }
    async recalculateAppraisalStatus(appraisalId) {
        const entries = await this.db
            .select({
            employeeLevelId: performance_appraisals_entries_schema_1.appraisalEntries.employeeLevelId,
            managerLevelId: performance_appraisals_entries_schema_1.appraisalEntries.managerLevelId,
        })
            .from(performance_appraisals_entries_schema_1.appraisalEntries)
            .where((0, drizzle_orm_1.eq)(performance_appraisals_entries_schema_1.appraisalEntries.appraisalId, appraisalId));
        const allEmployeeDone = entries.length > 0 && entries.every((e) => e.employeeLevelId);
        const allManagerDone = entries.length > 0 && entries.every((e) => e.managerLevelId);
        await this.db.update(performance_appraisal_cycle_schema_1.performanceAppraisalCycles).set({ status: 'active' });
        await this.db
            .update(performance_appraisals_schema_1.appraisals)
            .set({
            submittedByEmployee: allEmployeeDone,
            submittedByManager: allManagerDone,
            finalized: allEmployeeDone && allManagerDone,
        })
            .where((0, drizzle_orm_1.eq)(performance_appraisals_schema_1.appraisals.id, appraisalId));
    }
};
exports.AppraisalEntriesService = AppraisalEntriesService;
exports.AppraisalEntriesService = AppraisalEntriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AppraisalEntriesService);
//# sourceMappingURL=appraisal-entries.service.js.map