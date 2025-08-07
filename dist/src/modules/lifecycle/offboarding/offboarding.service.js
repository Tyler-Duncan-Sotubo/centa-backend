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
exports.OffboardingService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const termination_sessions_schema_1 = require("./schema/termination-sessions.schema");
const termination_checklist_items_schema_1 = require("./schema/termination-checklist-items.schema");
const audit_service_1 = require("../../audit/audit.service");
const assets_schema_1 = require("../../assets/schema/assets.schema");
const schema_1 = require("../../../drizzle/schema");
let OffboardingService = class OffboardingService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(createDto, user) {
        const { employeeId, terminationType, terminationReason, notes, checklistItemIds, } = createDto;
        const [existingSession] = await this.db
            .select()
            .from(termination_sessions_schema_1.termination_sessions)
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.termination_sessions.employeeId, employeeId));
        if (existingSession) {
            throw new common_1.BadRequestException('An offboarding session is already in progress for this employee.');
        }
        const [session] = await this.db
            .insert(termination_sessions_schema_1.termination_sessions)
            .values({
            employeeId,
            companyId: user.companyId,
            terminationType,
            terminationReason,
            notes,
            status: 'in_progress',
            startedAt: new Date(),
        })
            .returning();
        if (!session) {
            throw new common_1.BadRequestException('Failed to create termination session');
        }
        const checklistItems = await this.db
            .select()
            .from(termination_checklist_items_schema_1.termination_checklist_items)
            .where((0, drizzle_orm_1.inArray)(termination_checklist_items_schema_1.termination_checklist_items.id, checklistItemIds));
        if (checklistItems.length !== checklistItemIds.length) {
            throw new common_1.BadRequestException('One or more checklist item IDs are invalid.');
        }
        const assignedAssets = await this.db
            .select()
            .from(assets_schema_1.assets)
            .where((0, drizzle_orm_1.eq)(assets_schema_1.assets.employeeId, employeeId));
        const finalChecklistItems = checklistItems.flatMap((item, index) => {
            if (item.isAssetReturnStep) {
                return assignedAssets.map((asset, assetIndex) => ({
                    sessionId: session.id,
                    name: `Return: ${asset.name}`,
                    description: `Return assigned asset: ${asset.name} (${asset.internalId})`,
                    isAssetReturnStep: true,
                    assetId: asset.id,
                    order: index + assetIndex + 1,
                    completed: false,
                    createdAt: new Date(),
                }));
            }
            return [
                {
                    sessionId: session.id,
                    name: item.name,
                    description: item.description,
                    isAssetReturnStep: false,
                    order: index + 1,
                    completed: false,
                    createdAt: new Date(),
                },
            ];
        });
        await this.db
            .insert(termination_sessions_schema_1.employee_termination_checklist)
            .values(finalChecklistItems);
        await this.auditService.logAction({
            action: 'create',
            entity: 'termination_session',
            entityId: session.id,
            userId: user.id,
            details: 'Offboarding session created',
            changes: {
                sessionId: session.id,
                employeeId,
                terminationType,
                terminationReason,
                notes,
            },
        });
        return session;
    }
    async findAll(companyId) {
        const sessions = await this.db
            .select({
            id: termination_sessions_schema_1.termination_sessions.id,
            status: termination_sessions_schema_1.termination_sessions.status,
            employeeId: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            jobRole: schema_1.jobRoles.title,
            department: schema_1.departments.name,
            terminationType: schema_1.termination_types.name,
            terminationReason: schema_1.termination_reasons.name,
        })
            .from(termination_sessions_schema_1.termination_sessions)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, termination_sessions_schema_1.termination_sessions.employeeId))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .leftJoin(schema_1.termination_types, (0, drizzle_orm_1.eq)(schema_1.termination_types.id, termination_sessions_schema_1.termination_sessions.terminationType))
            .leftJoin(schema_1.termination_reasons, (0, drizzle_orm_1.eq)(schema_1.termination_reasons.id, termination_sessions_schema_1.termination_sessions.terminationReason))
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.termination_sessions.companyId, companyId));
        const checklistMap = await this.db
            .select({
            sessionId: termination_sessions_schema_1.employee_termination_checklist.sessionId,
            name: termination_sessions_schema_1.employee_termination_checklist.name,
            completed: termination_sessions_schema_1.employee_termination_checklist.completed,
            itemId: termination_sessions_schema_1.employee_termination_checklist.id,
        })
            .from(termination_sessions_schema_1.employee_termination_checklist);
        const groupedChecklist = checklistMap.reduce((acc, item) => {
            if (!acc[item.sessionId])
                acc[item.sessionId] = [];
            acc[item.sessionId].push({
                name: item.name,
                completed: item.completed ?? false,
                id: item.itemId,
            });
            return acc;
        }, {});
        return sessions.map((session) => {
            const checklist = groupedChecklist[session.id] ?? [];
            const total = checklist.length;
            const completed = checklist.filter((i) => i.completed).length;
            return {
                id: session.id,
                employeeName: `${session.firstName} ${session.lastName}`,
                jobRole: session.jobRole || null,
                department: session.department || null,
                terminationType: session.terminationType || null,
                terminationReason: session.terminationReason || null,
                status: session.status,
                checklist,
                progress: {
                    completed,
                    total,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                },
            };
        });
    }
    async findOne(id, companyId) {
        const session = await this.db.query.termination_sessions.findFirst({
            where: (t, { eq, and }) => and(eq(t.id, id), eq(t.companyId, companyId)),
        });
        if (!session) {
            throw new common_1.BadRequestException('Termination session not found');
        }
        const checklist = await this.db.query.employee_termination_checklist.findMany({
            where: (c, { eq }) => eq(c.sessionId, id),
            orderBy: (c, { asc }) => asc(c.order),
        });
        return {
            ...session,
            checklist,
        };
    }
    async update(id, dto, user) {
        const updated = await this.db
            .update(termination_sessions_schema_1.termination_sessions)
            .set({
            ...dto,
        })
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.termination_sessions.id, id))
            .returning();
        if (!updated.length) {
            throw new common_1.BadRequestException('Session not found');
        }
        await this.auditService.logAction({
            action: 'update',
            entity: 'termination_session',
            entityId: id,
            userId: user.id,
            details: 'Offboarding session updated',
            changes: {
                sessionId: id,
                ...dto,
            },
        });
        return updated[0];
    }
    async remove(id, user) {
        const session = await this.db.query.termination_sessions.findFirst({
            where: (t, { eq }) => eq(t.id, id),
        });
        if (!session) {
            throw new common_1.BadRequestException('Termination session not found');
        }
        await this.db
            .delete(termination_sessions_schema_1.termination_sessions)
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.termination_sessions.id, id));
        await this.auditService.logAction({
            action: 'delete',
            entity: 'termination_session',
            entityId: id,
            userId: user.id,
            details: 'Offboarding session deleted',
            changes: {
                sessionId: id,
            },
        });
        return { message: 'Session deleted' };
    }
    async updateChecklist(checklistItemId, user) {
        const [checklistItem] = await this.db
            .update(termination_sessions_schema_1.employee_termination_checklist)
            .set({
            completed: true,
            completedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.employee_termination_checklist.id, checklistItemId))
            .returning();
        if (!checklistItem) {
            throw new common_1.BadRequestException('Checklist item not found');
        }
        const sessionChecklist = await this.db
            .select({
            completed: termination_sessions_schema_1.employee_termination_checklist.completed,
        })
            .from(termination_sessions_schema_1.employee_termination_checklist)
            .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.employee_termination_checklist.sessionId, checklistItem.sessionId));
        const allCompleted = sessionChecklist.every((item) => item.completed);
        if (allCompleted) {
            const session = await this.db.query.termination_sessions.findFirst({
                where: (s, { eq }) => eq(s.id, checklistItem.sessionId),
            });
            if (!session) {
                throw new common_1.BadRequestException('Termination session not found');
            }
            const employeeId = session.employeeId;
            console.log('All checklist items completed for session:', checklistItem.sessionId);
            await this.db
                .update(termination_sessions_schema_1.termination_sessions)
                .set({
                status: 'completed',
                completedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(termination_sessions_schema_1.termination_sessions.id, checklistItem.sessionId));
            await this.db
                .update(schema_1.employees)
                .set({
                employmentStatus: 'inactive',
            })
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId));
        }
        console.log('All checklist items completed for session:', checklistItem.sessionId);
        await this.auditService.logAction({
            action: 'update',
            entity: 'termination_checklist_item',
            entityId: checklistItemId,
            userId: user.id,
            details: `Checklist item marked as completed`,
            changes: {
                checklistItemId,
                completed: true,
            },
        });
        return {
            message: 'Checklist item marked as completed',
            sessionCompleted: allCompleted,
        };
    }
};
exports.OffboardingService = OffboardingService;
exports.OffboardingService = OffboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], OffboardingService);
//# sourceMappingURL=offboarding.service.js.map