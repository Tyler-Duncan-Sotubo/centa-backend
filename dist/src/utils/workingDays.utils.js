"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countWorkingDays = countWorkingDays;
const isWorkingDay = (date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
};
function countWorkingDays(start, end) {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
        if (isWorkingDay(current))
            count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}
//# sourceMappingURL=workingDays.utils.js.map