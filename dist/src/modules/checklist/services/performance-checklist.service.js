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
exports.PerformanceChecklistService = exports.PERFORMANCE_EXTRA_KEYS = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const checklist_schema_1 = require("../schema/checklist.schema");
exports.PERFORMANCE_EXTRA_KEYS = [
    'performance_general',
    'goal_policies',
    'feedback_settings',
    'competency',
    'performance_templates',
    'appraisal_framework',
    'start_1_1_checkin',
];
let PerformanceChecklistService = class PerformanceChecklistService {
    constructor(db) {
        this.db = db;
    }
    async getExtraStatuses(companyId) {
        const rows = await this.db
            .select({ key: checklist_schema_1.checklistCompletion.checklistKey })
            .from(checklist_schema_1.checklistCompletion)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(checklist_schema_1.checklistCompletion.companyId, companyId), (0, drizzle_orm_1.inArray)(checklist_schema_1.checklistCompletion.checklistKey, [
            ...exports.PERFORMANCE_EXTRA_KEYS,
        ])));
        const done = new Set(rows.map((r) => r.key));
        return {
            performance_general: done.has('performance_general') ? 'done' : 'todo',
            goal_policies: done.has('goal_policies') ? 'done' : 'todo',
            feedback_settings: done.has('feedback_settings') ? 'done' : 'todo',
            competency: done.has('competency') ? 'done' : 'todo',
            performance_templates: done.has('performance_templates')
                ? 'done'
                : 'todo',
            appraisal_framework: done.has('appraisal_framework') ? 'done' : 'todo',
            start_1_1_checkin: done.has('start_1_1_checkin') ? 'done' : 'todo',
        };
    }
    async getPerformanceChecklist(companyId) {
        const extras = await this.getExtraStatuses(companyId);
        const order = [
            'performance_general',
            'goal_policies',
            'feedback_settings',
            'competency',
            'performance_templates',
            'appraisal_framework',
            'start_1_1_checkin',
        ];
        const orderedTasks = {};
        for (const key of order) {
            orderedTasks[key] = extras[key];
        }
        const required = order;
        const completed = required.every((key) => orderedTasks[key] === 'done');
        return {
            tasks: orderedTasks,
            required,
            completed,
            disabledWhenComplete: true,
        };
    }
};
exports.PerformanceChecklistService = PerformanceChecklistService;
exports.PerformanceChecklistService = PerformanceChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], PerformanceChecklistService);
//# sourceMappingURL=performance-checklist.service.js.map