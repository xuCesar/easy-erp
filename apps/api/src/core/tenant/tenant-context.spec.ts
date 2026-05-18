import { describe, expect, it } from 'vitest';
import {
  getTenantContext,
  runWithTenantContext,
} from './tenant-context';

describe('tenant context', () => {
  it('exposes the active tenant context inside the callback', () => {
    const result = runWithTenantContext(
      {
        tenantId: 'tenant-a',
        userId: 'user-a',
        factoryIds: ['factory-a'],
      },
      () => getTenantContext(),
    );

    expect(result).toEqual({
      tenantId: 'tenant-a',
      userId: 'user-a',
      factoryIds: ['factory-a'],
    });
  });

  it('keeps nested tenant contexts isolated', () => {
    const result = runWithTenantContext(
      {
        tenantId: 'tenant-a',
        userId: 'user-a',
        factoryIds: ['factory-a'],
      },
      () => {
        const outerBefore = getTenantContext();
        const inner = runWithTenantContext(
          {
            tenantId: 'tenant-b',
            userId: 'user-b',
            factoryIds: ['factory-b'],
          },
          () => getTenantContext(),
        );
        const outerAfter = getTenantContext();

        return { outerBefore, inner, outerAfter };
      },
    );

    expect(result).toEqual({
      outerBefore: {
        tenantId: 'tenant-a',
        userId: 'user-a',
        factoryIds: ['factory-a'],
      },
      inner: {
        tenantId: 'tenant-b',
        userId: 'user-b',
        factoryIds: ['factory-b'],
      },
      outerAfter: {
        tenantId: 'tenant-a',
        userId: 'user-a',
        factoryIds: ['factory-a'],
      },
    });
  });

  it('throws when tenant context is missing', () => {
    expect(() => getTenantContext()).toThrow(
      'Tenant context is not available.',
    );
  });
});
