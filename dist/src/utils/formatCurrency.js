"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNaira = exports.formatCurrency = void 0;
const formatCurrency = (amountInKobo, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amountInKobo);
};
exports.formatCurrency = formatCurrency;
const toNaira = (value) => value ? Math.round((value / 100) * 100) / 100 : 0;
exports.toNaira = toNaira;
//# sourceMappingURL=formatCurrency.js.map