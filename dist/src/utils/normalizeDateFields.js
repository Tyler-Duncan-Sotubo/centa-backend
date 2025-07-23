"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDateFields = normalizeDateFields;
const date_fns_1 = require("date-fns");
function normalizeDateFields(data) {
    const result = { ...data };
    for (const key of Object.keys(result)) {
        if (!key.toLowerCase().includes('date'))
            continue;
        const val = result[key];
        if (typeof val !== 'string' || !val.trim())
            continue;
        const trimmed = val.trim();
        if (trimmed.startsWith('_') || trimmed === 'N/A')
            continue;
        const candidates = [
            (0, date_fns_1.parse)(trimmed, 'yyyy-MM-dd', new Date()),
            (0, date_fns_1.parse)(trimmed, 'MMMM d, yyyy', new Date()),
            (0, date_fns_1.parse)(trimmed, 'MMM d, yyyy', new Date()),
            new Date(trimmed),
        ];
        const valid = candidates.find((d) => (0, date_fns_1.isValid)(d));
        if (valid) {
            result[key] = (0, date_fns_1.format)(valid, 'yyyy-MM-dd');
        }
    }
    return result;
}
//# sourceMappingURL=normalizeDateFields.js.map