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
var GoalCheckinCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalCheckinCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const goal_policy_service_1 = require("./goal-policy.service");
let GoalCheckinCronService = GoalCheckinCronService_1 = class GoalCheckinCronService {
    constructor(policyService) {
        this.policyService = policyService;
        this.logger = new common_1.Logger(GoalCheckinCronService_1.name);
    }
    async handleGoalCheckins() {
        this.logger.log('⏰ Running goal check-in scheduler...');
        const result = await this.policyService.processDueGoalCheckins();
        this.logger.log(`Processed=${result.processed}, Enqueued=${result.enqueued}, Skipped=${result.skipped}, Advanced=${result.advanced}`);
    }
};
exports.GoalCheckinCronService = GoalCheckinCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoalCheckinCronService.prototype, "handleGoalCheckins", null);
exports.GoalCheckinCronService = GoalCheckinCronService = GoalCheckinCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [goal_policy_service_1.PolicyService])
], GoalCheckinCronService);
//# sourceMappingURL=goal-checkin-cron.service.js.map