"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNaira = exports.formatCurrency = void 0;
const CURRENCY_SYMBOLS = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
};
const formatCurrency = (amount, currency = 'NGN', locale = 'en-NG') => {
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
    });
    let formatted = formatter.format(amount);
    const symbol = CURRENCY_SYMBOLS[currency];
    if (symbol && !formatted.includes(symbol)) {
        formatted = formatted.replace(currency, symbol);
    }
    return formatted;
};
exports.formatCurrency = formatCurrency;
const toNaira = (value) => value ? Math.round((value / 100) * 100) / 100 : 0;
exports.toNaira = toNaira;
//# sourceMappingURL=formatCurrency.js.map