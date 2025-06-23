"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leave = void 0;
exports.leave = [
    { key: 'leave.approver', value: 'manager' },
    { key: 'leave.multi_level_approval', value: false },
    { key: 'leave.approver_chain', value: ['manager'] },
    { key: 'leave.auto_approve_after_days', value: 7 },
    { key: 'leave.default_annual_entitlement', value: 20 },
    { key: 'leave.allow_carryover', value: true },
    { key: 'leave.carryover_limit', value: 5 },
    { key: 'leave.allow_negative_balance', value: false },
    { key: 'leave.allow_unconfirmed_leave', value: false },
    {
        key: 'leave.allowed_leave_types_for_unconfirmed',
        value: ['Sick Leave', 'Unpaid Leave'],
    },
    { key: 'leave.exclude_weekends', value: true },
    { key: 'leave.weekend_days', value: ['Saturday', 'Sunday'] },
    { key: 'leave.exclude_public_holidays', value: true },
    {
        key: 'leave.notifications',
        value: {
            notifyApprover: true,
            notifyHr: false,
            notifyLineManager: false,
            notifyEmployeeOnDecision: true,
            notificationCcRoles: [],
            notificationChannels: ['email'],
        },
    },
    { key: 'leave.min_notice_days', value: 3 },
    { key: 'leave.max_consecutive_days', value: 30 },
];
//# sourceMappingURL=leave.js.map