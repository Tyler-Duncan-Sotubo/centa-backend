"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceModule = void 0;
const common_1 = require("@nestjs/common");
const performance_settings_module_1 = require("./performance-settings/performance-settings.module");
const cycle_module_1 = require("./cycle/cycle.module");
const goals_module_1 = require("./goals/goals.module");
const assessments_module_1 = require("./assessments/assessments.module");
const templates_module_1 = require("./templates/templates.module");
const calibration_module_1 = require("./calibration/calibration.module");
const feedback_module_1 = require("./feedback/feedback.module");
const appraisals_module_1 = require("./appraisals/appraisals.module");
const report_module_1 = require("./report/report.module");
let PerformanceModule = class PerformanceModule {
};
exports.PerformanceModule = PerformanceModule;
exports.PerformanceModule = PerformanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            performance_settings_module_1.PerformanceSettingsModule,
            cycle_module_1.CycleModule,
            goals_module_1.GoalsModule,
            assessments_module_1.AssessmentsModule,
            templates_module_1.TemplatesModule,
            calibration_module_1.CalibrationModule,
            feedback_module_1.FeedbackModule,
            appraisals_module_1.AppraisalsModule,
            report_module_1.ReportModule,
        ],
        exports: [
            performance_settings_module_1.PerformanceSettingsModule,
            cycle_module_1.CycleModule,
            goals_module_1.GoalsModule,
            assessments_module_1.AssessmentsModule,
            templates_module_1.TemplatesModule,
            calibration_module_1.CalibrationModule,
        ],
    })
], PerformanceModule);
//# sourceMappingURL=performance.module.js.map