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
exports.ChecklistService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const checklist_schema_1 = require("./schema/checklist.schema");
let ChecklistService = class ChecklistService {
    constructor(db) {
        this.db = db;
    }
    async markExtraDone(companyId, key, userId) {
        await this.db
            .insert(checklist_schema_1.checklistCompletion)
            .values({ companyId, checklistKey: key, completedBy: userId })
            .onConflictDoUpdate({
            target: [
                checklist_schema_1.checklistCompletion.companyId,
                checklist_schema_1.checklistCompletion.checklistKey,
            ],
            set: {
                completedBy: (0, drizzle_orm_1.sql) `EXCLUDED.completed_by`,
                completedAt: (0, drizzle_orm_1.sql) `now()`,
            },
        });
    }
};
exports.ChecklistService = ChecklistService;
exports.ChecklistService = ChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], ChecklistService);
//# sourceMappingURL=checklist.service.js.map