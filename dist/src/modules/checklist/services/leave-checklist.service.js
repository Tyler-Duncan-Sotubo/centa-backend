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
exports.LeaveChecklistService = exports.LEAVE_EXTRA_KEYS = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const checklist_schema_1 = require("../schema/checklist.schema");
exports.LEAVE_EXTRA_KEYS = [
    'leave_settings',
    'leave_types_policies',
    'holidays',
    'blocked_days',
    'reserved_days',
];
let LeaveChecklistService = class LeaveChecklistService {
    constructor(db) {
        this.db = db;
    }
    async getExtraStatuses(companyId) {
        const rows = await this.db
            .select({ key: checklist_schema_1.checklistCompletion.checklistKey })
            .from(checklist_schema_1.checklistCompletion)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(checklist_schema_1.checklistCompletion.companyId, companyId), (0, drizzle_orm_1.inArray)(checklist_schema_1.checklistCompletion.checklistKey, [...exports.LEAVE_EXTRA_KEYS])));
        const done = new Set(rows.map((r) => r.key));
        return {
            leave_settings: done.has('leave_settings') ? 'done' : 'todo',
            leave_types_policies: done.has('leave_types_policies') ? 'done' : 'todo',
            holidays: done.has('holidays') ? 'done' : 'todo',
            blocked_days: done.has('blocked_days') ? 'done' : 'todo',
            reserved_days: done.has('reserved_days') ? 'done' : 'todo',
        };
    }
    async getLeaveChecklist(companyId) {
        const extras = await this.getExtraStatuses(companyId);
        const required = [];
        const completed = required.length === 0;
        const order = [
            'leave_settings',
            'leave_types_policies',
            'holidays',
            'blocked_days',
            'reserved_days',
        ];
        const tasks = {};
        for (const key of order)
            tasks[key] = extras[key];
        return {
            tasks,
            required,
            completed,
            disabledWhenComplete: true,
        };
    }
};
exports.LeaveChecklistService = LeaveChecklistService;
exports.LeaveChecklistService = LeaveChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], LeaveChecklistService);
//# sourceMappingURL=leave-checklist.service.js.map