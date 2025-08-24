"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clampPct = exports.toNum = void 0;
const toNum = (v) => {
    if (v === null || v === undefined)
        return null;
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
};
exports.toNum = toNum;
const clampPct = (x) => Math.min(100, Math.max(0, x));
exports.clampPct = clampPct;
//# sourceMappingURL=compute-goals.js.map