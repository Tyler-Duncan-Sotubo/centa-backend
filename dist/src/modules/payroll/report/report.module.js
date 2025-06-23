"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportModule = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const report_controller_1 = require("./report.controller");
const run_service_1 = require("../run/run.service");
const s3_storage_service_1 = require("../../../common/aws/s3-storage.service");
const generate_report_service_1 = require("./generate-report.service");
const bullmq_1 = require("@nestjs/bullmq");
const salary_advance_service_1 = require("../salary-advance/salary-advance.service");
let ReportModule = class ReportModule {
};
exports.ReportModule = ReportModule;
exports.ReportModule = ReportModule = __decorate([
    (0, common_1.Module)({
        controllers: [report_controller_1.ReportController],
        providers: [
            report_service_1.ReportService,
            run_service_1.RunService,
            s3_storage_service_1.S3StorageService,
            generate_report_service_1.GenerateReportService,
            salary_advance_service_1.SalaryAdvanceService,
        ],
        exports: [report_service_1.ReportService],
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'payrollQueue',
            }),
        ],
    })
], ReportModule);
//# sourceMappingURL=report.module.js.map