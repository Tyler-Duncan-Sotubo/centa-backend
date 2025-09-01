"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNaira = exports.formatCurrency = void 0;
const formatCurrency = (amount, currency = 'NGN') => {
    const formatter = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    });
    let formatted = formatter.format(amount);
    if (currency === 'NGN') {
        formatted = formatted.replace('NGN', '₦');
    }
    return formatted;
};
exports.formatCurrency = formatCurrency;
const toNaira = (value) => value ? Math.round((value / 100) * 100) / 100 : 0;
exports.toNaira = toNaira;
//# sourceMappingURL=formatCurrency.js.map