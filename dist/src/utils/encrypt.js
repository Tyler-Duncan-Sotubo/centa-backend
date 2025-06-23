"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const bcrypt = require("bcryptjs");
const SALT_ROUNDS = 12;
async function encrypt(pin) {
    return bcrypt.hash(pin, SALT_ROUNDS);
}
async function decrypt(pin, hash) {
    return bcrypt.compare(pin, hash);
}
//# sourceMappingURL=encrypt.js.map