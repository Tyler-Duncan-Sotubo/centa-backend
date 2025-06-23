import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function encrypt(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function decrypt(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
