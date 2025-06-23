"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunModule = void 0;
const common_1 = require("@nestjs/common");
const run_service_1 = require("./run.service");
const run_controller_1 = require("./run.controller");
const bullmq_1 = require("@nestjs/bullmq");
const salary_advance_service_1 = require("../salary-advance/salary-advance.service");
let RunModule = class RunModule {
};
exports.RunModule = RunModule;
exports.RunModule = RunModule = __decorate([
    (0, common_1.Module)({
        controllers: [run_controller_1.RunController],
        providers: [run_service_1.RunService, salary_advance_service_1.SalaryAdvanceService],
        exports: [run_service_1.RunService],
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'payrollQueue',
            }),
        ],
    })
], RunModule);
//# sourceMappingURL=run.module.js.map