import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import type { AuthPrincipal, AuthTokenClaims, TokenKind } from './auth.types';

const accessTokenTtlSeconds = 7200;
const refreshTokenTtlSeconds = 60 * 60 * 24 * 30;

export type TokenSecrets = {
  accessSecret: string;
  refreshSecret: string;
};

export type SignedRefreshToken = {
  token: string;
  tokenId: string;
  expiresAt: Date;
};

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(secrets?: TokenSecrets) {
    this.accessSecret =
      secrets?.accessSecret ?? requireEnv('JWT_ACCESS_SECRET');
    this.refreshSecret =
      secrets?.refreshSecret ?? requireEnv('JWT_REFRESH_SECRET');
  }

  getAccessTokenTtlSeconds(): number {
    return accessTokenTtlSeconds;
  }

  signAccessToken(principal: AuthPrincipal): string {
    return this.signToken(principal, 'access', accessTokenTtlSeconds);
  }

  signRefreshToken(principal: AuthPrincipal): SignedRefreshToken {
    const tokenId = randomUUID();
    const expiresAt = new Date(Date.now() + refreshTokenTtlSeconds * 1000);

    return {
      token: this.signToken(principal, 'refresh', refreshTokenTtlSeconds, tokenId),
      tokenId,
      expiresAt,
    };
  }

  verifyAccessToken(token: string): AuthTokenClaims {
    return this.verifyToken(token, 'access');
  }

  verifyRefreshToken(token: string): AuthTokenClaims {
    return this.verifyToken(token, 'refresh');
  }

  private signToken(
    principal: AuthPrincipal,
    type: TokenKind,
    ttlSeconds: number,
    jti?: string,
  ): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const claims: AuthTokenClaims = {
      ...principal,
      type,
      iat: nowSeconds,
      exp: nowSeconds + ttlSeconds,
      ...(jti ? { jti } : {}),
    };
    const encodedHeader = this.encodeJson({
      alg: 'HS256',
      typ: 'JWT',
    });
    const encodedPayload = this.encodeJson(claims);
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`, type);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string, expectedType: TokenKind): AuthTokenClaims {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid token.');
    }

    const expectedSignature = this.sign(
      `${encodedHeader}.${encodedPayload}`,
      expectedType,
    );

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid token.');
    }

    const claims = this.decodeJson<AuthTokenClaims>(encodedPayload);

    if (claims.type !== expectedType || claims.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Invalid token.');
    }

    return claims;
  }

  private sign(content: string, type: TokenKind): string {
    const secret = type === 'access' ? this.accessSecret : this.refreshSecret;

    return createHmac('sha256', secret).update(content).digest('base64url');
  }

  private encodeJson(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodeJson<T>(value: string): T {
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
    } catch {
      throw new UnauthorizedException('Invalid token.');
    }
  }
}

function requireEnv(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
