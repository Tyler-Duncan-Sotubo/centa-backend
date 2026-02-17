"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGoalSubject = buildGoalSubject;
function buildGoalSubject(bucket) {
    switch (bucket) {
        case 't7':
            return 'Goal deadline approaching';
        case 't2':
            return 'Reminder: goal due in 2 days';
        case 'today':
            return 'Due today: goal check-in required';
        case 'overdue':
            return 'Overdue: goal update required';
        default:
            return 'Goal reminder';
    }
}
//# sourceMappingURL=helper.js.map