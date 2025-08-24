"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalsModule = void 0;
const common_1 = require("@nestjs/common");
const goals_service_1 = require("./goals.service");
const goals_controller_1 = require("./goals.controller");
const goal_activity_service_1 = require("./goal-activity.service");
const goal_policy_controller_1 = require("./goal-policy.controller");
const goal_policy_service_1 = require("./goal-policy.service");
const bullmq_1 = require("@nestjs/bullmq");
const goal_checkin_cron_service_1 = require("./goal-checkin-cron.service");
let GoalsModule = class GoalsModule {
};
exports.GoalsModule = GoalsModule;
exports.GoalsModule = GoalsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'emailQueue',
            }),
        ],
        controllers: [goals_controller_1.GoalsController, goal_policy_controller_1.PerformancePolicyController],
        providers: [
            goals_service_1.GoalsService,
            goal_activity_service_1.GoalActivityService,
            goal_policy_service_1.PolicyService,
            goal_checkin_cron_service_1.GoalCheckinCronService,
        ],
    })
], GoalsModule);
//# sourceMappingURL=goals.module.js.map