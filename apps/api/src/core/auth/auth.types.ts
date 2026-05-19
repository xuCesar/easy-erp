import type { DataScope, RoleName } from '../permission/permission.types';

export type AuthPrincipal = {
  id: string;
  tenantId: string;
  employeeId: string | null;
  roles: RoleName[];
  dataScopes: DataScope[];
};

export type LoginRequest = {
  phone: string;
  password: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type LogoutRequest = RefreshRequest;

export type AuthUserResponse = {
  id: string;
  tenantId: string;
  employeeId: string | null;
  roles: RoleName[];
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserResponse;
};

export type TokenKind = 'access' | 'refresh';

export type AuthTokenClaims = AuthPrincipal & {
  type: TokenKind;
  exp: number;
  iat: number;
  jti?: string;
};
