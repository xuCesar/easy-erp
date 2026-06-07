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

export type CurrentUserProfileResponse = {
  user: AuthUserResponse & {
    phone: string;
    status: 'ACTIVE' | 'DISABLED';
    dataScopes: DataScope[];
  };
  employee: {
    id: string;
    factoryId: string;
    orgUnitId: string | null;
    empNo: string;
    name: string;
    phone: string | null;
    entryDate: string;
    status: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
  } | null;
  factories: Array<{
    id: string;
    name: string;
    timezone: string;
    status: 'ACTIVE' | 'DISABLED';
  }>;
  orgUnits: Array<{
    id: string;
    factoryId: string;
    parentId: string | null;
    name: string;
    type: 'DEPARTMENT' | 'WORKSHOP' | 'LINE' | 'TEAM' | 'GROUP' | 'CUSTOM';
    sortOrder: number;
    status: 'ACTIVE' | 'DISABLED';
  }>;
  defaultScope: {
    factoryId: string | null;
    orgUnitId: string | null;
  };
};

export type TokenKind = 'access' | 'refresh';

export type AuthTokenClaims = AuthPrincipal & {
  type: TokenKind;
  exp: number;
  iat: number;
  jti?: string;
};
