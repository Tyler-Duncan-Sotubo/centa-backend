"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestModule = void 0;
const common_1 = require("@nestjs/common");
const leave_request_service_1 = require("./leave-request.service");
const leave_request_controller_1 = require("./leave-request.controller");
const leave_settings_service_1 = require("../settings/leave-settings.service");
const leave_balance_service_1 = require("../balance/leave-balance.service");
const blocked_days_service_1 = require("../blocked-days/blocked-days.service");
const reserved_days_service_1 = require("../reserved-days/reserved-days.service");
let LeaveRequestModule = class LeaveRequestModule {
};
exports.LeaveRequestModule = LeaveRequestModule;
exports.LeaveRequestModule = LeaveRequestModule = __decorate([
    (0, common_1.Module)({
        controllers: [leave_request_controller_1.LeaveRequestController],
        providers: [
            leave_request_service_1.LeaveRequestService,
            leave_settings_service_1.LeaveSettingsService,
            leave_balance_service_1.LeaveBalanceService,
            blocked_days_service_1.BlockedDaysService,
            reserved_days_service_1.ReservedDaysService,
        ],
        exports: [leave_request_service_1.LeaveRequestService],
    })
], LeaveRequestModule);
//# sourceMappingURL=leave-request.module.js.map