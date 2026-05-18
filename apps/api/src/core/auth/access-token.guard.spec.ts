import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AccessTokenGuard } from './access-token.guard';
import { TokenService } from './token.service';

type MutableRequest = {
  headers: Record<string, string | undefined>;
  user?: unknown;
};

function createExecutionContext(request: MutableRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AccessTokenGuard', () => {
  it('sets request.user from a valid bearer token', () => {
    const tokenService = new TokenService({
      accessSecret: 'access-secret',
      refreshSecret: 'refresh-secret',
    });
    const token = tokenService.signAccessToken({
      id: 'user-1',
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      roles: ['EMPLOYEE'],
      dataScopes: [
        {
          type: 'EMPLOYEE',
          employeeId: 'employee-1',
        },
      ],
    });
    const request: MutableRequest = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const guard = new AccessTokenGuard(tokenService);

    expect(guard.canActivate(createExecutionContext(request))).toBe(true);
    expect(request.user).toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      roles: ['EMPLOYEE'],
    });
  });

  it('rejects requests without bearer token', () => {
    const guard = new AccessTokenGuard(
      new TokenService({
        accessSecret: 'access-secret',
        refreshSecret: 'refresh-secret',
      }),
    );

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          headers: {},
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
