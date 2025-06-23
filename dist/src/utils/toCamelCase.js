"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCamelCase = toCamelCase;
function toCamelCase(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .map((word, index) => index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
//# sourceMappingURL=toCamelCase.js.map