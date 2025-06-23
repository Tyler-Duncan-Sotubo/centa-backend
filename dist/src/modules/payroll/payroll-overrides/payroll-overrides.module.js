"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollOverridesModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_overrides_service_1 = require("./payroll-overrides.service");
const payroll_overrides_controller_1 = require("./payroll-overrides.controller");
let PayrollOverridesModule = class PayrollOverridesModule {
};
exports.PayrollOverridesModule = PayrollOverridesModule;
exports.PayrollOverridesModule = PayrollOverridesModule = __decorate([
    (0, common_1.Module)({
        controllers: [payroll_overrides_controller_1.PayrollOverridesController],
        providers: [payroll_overrides_service_1.PayrollOverridesService],
    })
], PayrollOverridesModule);
//# sourceMappingURL=payroll-overrides.module.js.map