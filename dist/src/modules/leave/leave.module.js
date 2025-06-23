"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveModule = void 0;
const common_1 = require("@nestjs/common");
const leave_types_module_1 = require("./types/leave-types.module");
const leave_policy_module_1 = require("./policy/leave-policy.module");
const leave_request_module_1 = require("./request/leave-request.module");
const leave_balance_module_1 = require("./balance/leave-balance.module");
const leave_approval_module_1 = require("./approval/leave-approval.module");
const report_module_1 = require("./report/report.module");
const leave_settings_module_1 = require("./settings/leave-settings.module");
const blocked_days_module_1 = require("./blocked-days/blocked-days.module");
const reserved_days_module_1 = require("./reserved-days/reserved-days.module");
let LeaveModule = class LeaveModule {
};
exports.LeaveModule = LeaveModule;
exports.LeaveModule = LeaveModule = __decorate([
    (0, common_1.Module)({
        controllers: [],
        providers: [],
        imports: [
            leave_types_module_1.LeaveTypesModule,
            leave_policy_module_1.LeavePolicyModule,
            leave_request_module_1.LeaveRequestModule,
            leave_balance_module_1.LeaveBalanceModule,
            leave_approval_module_1.LeaveApprovalModule,
            report_module_1.ReportModule,
            leave_settings_module_1.LeaveSettingsModule,
            blocked_days_module_1.BlockedDaysModule,
            reserved_days_module_1.ReservedDaysModule,
        ],
        exports: [
            leave_types_module_1.LeaveTypesModule,
            leave_policy_module_1.LeavePolicyModule,
            leave_request_module_1.LeaveRequestModule,
            leave_balance_module_1.LeaveBalanceModule,
        ],
    })
], LeaveModule);
//# sourceMappingURL=leave.module.js.map