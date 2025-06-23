"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = void 0;
const slugify = (value) => {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.slugify = slugify;
//# sourceMappingURL=slugify.js.map