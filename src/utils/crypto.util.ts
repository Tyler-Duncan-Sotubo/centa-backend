import * as crypto from 'crypto';
import 'dotenv/config';

const HEX_KEY = process.env.FINANCE_ENCRYPTION_KEY;

if (!HEX_KEY) {
  throw new Error(
    'Missing FINANCE_ENCRYPTION_KEY: please set a 64-hex-char env var',
  );
}
if (!/^[0-9a-fA-F]{64}$/.test(HEX_KEY)) {
  throw new Error(
    'Invalid FINANCE_ENCRYPTION_KEY: must be exactly 64 hex characters',
  );
}

// AES-256-CBC requires a 32-byte key (64 hex chars) and a 16-byte IV
const KEY = Buffer.from(HEX_KEY, 'hex');
const IV_LENGTH = 16;

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  // Store as `ivHex:dataHex`
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(enc: string): string {
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
