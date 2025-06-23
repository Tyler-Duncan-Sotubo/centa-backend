"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenefitPlanModule = void 0;
const common_1 = require("@nestjs/common");
const benefit_plan_service_1 = require("./benefit-plan.service");
const benefit_plan_controller_1 = require("./benefit-plan.controller");
let BenefitPlanModule = class BenefitPlanModule {
};
exports.BenefitPlanModule = BenefitPlanModule;
exports.BenefitPlanModule = BenefitPlanModule = __decorate([
    (0, common_1.Module)({
        controllers: [benefit_plan_controller_1.BenefitPlanController],
        providers: [benefit_plan_service_1.BenefitPlanService],
    })
], BenefitPlanModule);
//# sourceMappingURL=benefit-plan.module.js.map