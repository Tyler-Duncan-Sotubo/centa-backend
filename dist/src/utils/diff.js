"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffRecords = diffRecords;
function diffRecords(before, after, fields) {
    const out = {};
    for (const f of fields) {
        if ((before[f] ?? null) !== (after[f] ?? null)) {
            out[f] = { before: before[f], after: after[f] };
        }
    }
    return out;
}
//# sourceMappingURL=diff.js.map