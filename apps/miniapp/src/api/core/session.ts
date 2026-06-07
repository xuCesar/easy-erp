import type { LoginResponse } from '@easy-erp/shared-types';
import { cache } from '../../cache';

export interface MiniappSession {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  employeeId: string | null;
  roles: string[];
  expiresAt: number;
}

export function createSession(response: LoginResponse): MiniappSession {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    tenantId: response.user.tenantId,
    employeeId: response.user.employeeId,
    roles: response.user.roles,
    expiresAt: Date.now() + response.expiresIn * 1000,
  };
}

export function saveSession(session: MiniappSession): void {
  cache.set('session', session);
}

export function loadSession(): MiniappSession | null {
  const session = cache.get('session');
  return session && typeof session.accessToken === 'string' ? session : null;
}

export function isSessionActive(session: MiniappSession | null): session is MiniappSession {
  return Boolean(session && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now());
}

export function clearSession(): void {
  cache.remove('session');
}
