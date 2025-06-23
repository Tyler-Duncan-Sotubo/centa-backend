"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveApprovalModule = void 0;
const common_1 = require("@nestjs/common");
const leave_approval_service_1 = require("./leave-approval.service");
const leave_approval_controller_1 = require("./leave-approval.controller");
const leave_balance_service_1 = require("../balance/leave-balance.service");
const leave_settings_service_1 = require("../settings/leave-settings.service");
let LeaveApprovalModule = class LeaveApprovalModule {
};
exports.LeaveApprovalModule = LeaveApprovalModule;
exports.LeaveApprovalModule = LeaveApprovalModule = __decorate([
    (0, common_1.Module)({
        controllers: [leave_approval_controller_1.LeaveApprovalController],
        providers: [leave_approval_service_1.LeaveApprovalService, leave_balance_service_1.LeaveBalanceService, leave_settings_service_1.LeaveSettingsService],
    })
], LeaveApprovalModule);
//# sourceMappingURL=leave-approval.module.js.map