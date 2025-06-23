"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto = require("crypto");
require("dotenv/config");
const HEX_KEY = process.env.FINANCE_ENCRYPTION_KEY;
if (!HEX_KEY) {
    throw new Error('Missing FINANCE_ENCRYPTION_KEY: please set a 64-hex-char env var');
}
if (!/^[0-9a-fA-F]{64}$/.test(HEX_KEY)) {
    throw new Error('Invalid FINANCE_ENCRYPTION_KEY: must be exactly 64 hex characters');
}
const KEY = Buffer.from(HEX_KEY, 'hex');
const IV_LENGTH = 16;
function encrypt(plain) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
    const encrypted = Buffer.concat([
        cipher.update(plain, 'utf8'),
        cipher.final(),
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
function decrypt(enc) {
    if (!enc.includes(':')) {
        throw new Error('Malformed encrypted string');
    }
    const [ivHex, dataHex] = enc.split(':', 2);
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
}
//# sourceMappingURL=crypto.util.js.map