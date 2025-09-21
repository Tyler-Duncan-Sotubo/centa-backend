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
exports.AttendanceChecklistService = exports.ATTENDANCE_EXTRA_KEYS = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const checklist_schema_1 = require("../schema/checklist.schema");
exports.ATTENDANCE_EXTRA_KEYS = [
    'attendance_setting',
    'shift_management',
    'assign_rota',
    'add_office_location',
];
let AttendanceChecklistService = class AttendanceChecklistService {
    constructor(db) {
        this.db = db;
    }
    async getExtraStatuses(companyId) {
        const rows = await this.db
            .select({ key: checklist_schema_1.checklistCompletion.checklistKey })
            .from(checklist_schema_1.checklistCompletion)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(checklist_schema_1.checklistCompletion.companyId, companyId), (0, drizzle_orm_1.inArray)(checklist_schema_1.checklistCompletion.checklistKey, [...exports.ATTENDANCE_EXTRA_KEYS])));
        const done = new Set(rows.map((r) => r.key));
        return {
            attendance_setting: done.has('attendance_setting') ? 'done' : 'todo',
            shift_management: done.has('shift_management') ? 'done' : 'todo',
            assign_rota: done.has('assign_rota') ? 'done' : 'todo',
            add_office_location: done.has('add_office_location') ? 'done' : 'todo',
        };
    }
    async getAttendanceChecklist(companyId) {
        const extras = await this.getExtraStatuses(companyId);
        const required = [];
        const completed = required.length === 0;
        const order = [
            'attendance_setting',
            'shift_management',
            'assign_rota',
            'add_office_location',
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
exports.AttendanceChecklistService = AttendanceChecklistService;
exports.AttendanceChecklistService = AttendanceChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AttendanceChecklistService);
//# sourceMappingURL=attendance-checklist.service.js.map