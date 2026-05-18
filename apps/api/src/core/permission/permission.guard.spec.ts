import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './permission.decorators';
import { PermissionService } from './permission.service';
import type { AuthPrincipal } from '../auth/auth.types';

function createExecutionContext(
  handler: () => void,
  user?: AuthPrincipal,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  it('rejects requests without authenticated principal', () => {
    class TestController {
      @RequirePermission('employee:profile:view')
      handle(): void {}
    }
    const guard = new PermissionGuard(new Reflector(), new PermissionService());
    const controller = new TestController();

    expect(() =>
      guard.canActivate(createExecutionContext(controller.handle)),
    ).toThrow(UnauthorizedException);
  });

  it('rejects authenticated principals without required permission', () => {
    class TestController {
      @RequirePermission('account:user:manage')
      handle(): void {}
    }
    const guard = new PermissionGuard(new Reflector(), new PermissionService());
    const controller = new TestController();

    expect(() =>
      guard.canActivate(
        createExecutionContext(controller.handle, {
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
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows authenticated principals with required permission', () => {
    class TestController {
      @RequirePermission('employee:profile:view')
      handle(): void {}
    }
    const guard = new PermissionGuard(new Reflector(), new PermissionService());
    const controller = new TestController();

    expect(
      guard.canActivate(
        createExecutionContext(controller.handle, {
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
        }),
      ),
    ).toBe(true);
  });
});
