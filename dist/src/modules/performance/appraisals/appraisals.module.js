"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppraisalsModule = void 0;
const common_1 = require("@nestjs/common");
const appraisals_service_1 = require("./appraisals.service");
const appraisals_controller_1 = require("./appraisals.controller");
const appraisal_cycle_service_1 = require("./appraisal-cycle.service");
const appraisal_cron_1 = require("./appraisal.cron");
const performance_settings_service_1 = require("../performance-settings/performance-settings.service");
const appraisal_entries_service_1 = require("./appraisal-entries.service");
let AppraisalsModule = class AppraisalsModule {
};
exports.AppraisalsModule = AppraisalsModule;
exports.AppraisalsModule = AppraisalsModule = __decorate([
    (0, common_1.Module)({
        controllers: [appraisals_controller_1.AppraisalsController],
        providers: [
            appraisals_service_1.AppraisalsService,
            appraisal_cycle_service_1.AppraisalCycleService,
            appraisal_cron_1.AutoCreatePerformanceCronService,
            performance_settings_service_1.PerformanceSettingsService,
            appraisal_entries_service_1.AppraisalEntriesService,
        ],
    })
], AppraisalsModule);
//# sourceMappingURL=appraisals.module.js.map