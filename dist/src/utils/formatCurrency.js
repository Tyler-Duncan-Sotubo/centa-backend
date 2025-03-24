"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCurrency = void 0;
const formatCurrency = (amountInKobo, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amountInKobo / 100);
};
exports.formatCurrency = formatCurrency;
//# sourceMappingURL=formatCurrency.js.map