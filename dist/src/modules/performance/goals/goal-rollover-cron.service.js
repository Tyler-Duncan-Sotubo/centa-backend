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
var GoalRolloverCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalRolloverCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_goals_schema_1 = require("../goals/schema/performance-goals.schema");
const cycle_service_1 = require("../cycle/cycle.service");
const company_service_1 = require("../../core/company/company.service");
const date_fns_1 = require("date-fns");
let GoalRolloverCronService = GoalRolloverCronService_1 = class GoalRolloverCronService {
    constructor(db, companyService, cycleService) {
        this.db = db;
        this.companyService = companyService;
        this.cycleService = cycleService;
        this.logger = new common_1.Logger(GoalRolloverCronService_1.name);
    }
    async handleRollover() {
        const companies = await this.companyService.getAllCompanies();
        const today = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
        for (const company of companies) {
            try {
                const lastCycle = await this.cycleService.getLastCycle(company.id);
                if (!lastCycle)
                    continue;
                if (lastCycle.startDate > today)
                    continue;
                const cycles = await this.cycleService.findAll(company.id);
                const sorted = cycles.sort((a, b) => a.startDate.localeCompare(b.startDate));
                const index = sorted.findIndex((c) => c.id === lastCycle.id);
                if (index <= 0)
                    continue;
                const previousCycle = sorted[index - 1];
                const goals = await this.db
                    .select()
                    .from(performance_goals_schema_1.performanceGoals)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, company.id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.cycleId, previousCycle.id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isRecurring, true), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false)));
                if (!goals.length)
                    continue;
                for (const goal of goals) {
                    try {
                        await this.db.insert(performance_goals_schema_1.performanceGoals).values({
                            title: goal.title,
                            description: goal.description,
                            companyId: company.id,
                            cycleId: lastCycle.id,
                            employeeId: goal.employeeId,
                            employeeGroupId: goal.employeeGroupId,
                            startDate: lastCycle.startDate,
                            dueDate: lastCycle.endDate,
                            weight: goal.weight,
                            assignedBy: goal.assignedBy,
                            status: 'draft',
                            isRecurring: true,
                            assignedAt: new Date(),
                        });
                    }
                    catch (e) {
                        this.logger.error(`Failed to rollover goal ${goal.id} for ${company.name}`, e?.stack ?? String(e));
                    }
                }
                this.logger.log(`Rolled ${goals.length} goals → ${lastCycle.name} (${company.name})`);
            }
            catch (e) {
                this.logger.error(`Rollover failed for ${company.name}`, e?.stack ?? String(e));
            }
        }
    }
};
exports.GoalRolloverCronService = GoalRolloverCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoalRolloverCronService.prototype, "handleRollover", null);
exports.GoalRolloverCronService = GoalRolloverCronService = GoalRolloverCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, company_service_1.CompanyService,
        cycle_service_1.CycleService])
], GoalRolloverCronService);
//# sourceMappingURL=goal-rollover-cron.service.js.map