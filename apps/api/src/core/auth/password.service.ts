import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const keyLength = 64;
const scryptOptions = {
  N: 16_384,
  r: 8,
  p: 1,
} as const;

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const salt = randomBytes(16).toString('base64url');
    const derivedKey = await deriveKey(password, salt, scryptOptions);

    return [
      'scrypt',
      String(scryptOptions.N),
      String(scryptOptions.r),
      String(scryptOptions.p),
      salt,
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const parts = passwordHash.split('$');

    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const [, n, r, p, salt, expectedKey] = parts;
    const derivedKey = await deriveKey(password, salt, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const expectedBuffer = Buffer.from(expectedKey, 'base64url');

    if (derivedKey.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, expectedBuffer);
  }
}

function deriveKey(
  password: string,
  salt: string,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}
