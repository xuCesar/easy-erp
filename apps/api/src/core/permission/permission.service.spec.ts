import { describe, expect, it } from 'vitest';
import { PermissionService } from './permission.service';
import type { AuthPrincipal } from '../auth/auth.types';

const employeePrincipal: AuthPrincipal = {
  id: 'user-employee',
  tenantId: 'tenant-1',
  employeeId: 'employee-1',
  roles: ['EMPLOYEE'],
  dataScopes: [
    {
      type: 'EMPLOYEE',
      employeeId: 'employee-1',
    },
  ],
};

describe('PermissionService', () => {
  const service = new PermissionService();

  it('allows employees to access their own attendance data only', () => {
    expect(
      service.canAccessResource(employeePrincipal, {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
      }),
    ).toBe(true);

    expect(
      service.canAccessResource(employeePrincipal, {
        tenantId: 'tenant-1',
        employeeId: 'employee-2',
      }),
    ).toBe(false);
  });

  it('allows organization managers to access authorized org units and children only', () => {
    const principal: AuthPrincipal = {
      id: 'user-manager',
      tenantId: 'tenant-1',
      employeeId: 'manager-1',
      roles: ['ORG_MANAGER'],
      dataScopes: [
        {
          type: 'ORG_UNIT',
          orgUnitId: 'org-parent',
        },
      ],
    };

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-1',
        employeeId: 'employee-child',
        orgUnitId: 'org-child',
        orgUnitAncestorIds: ['org-parent'],
      }),
    ).toBe(true);

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-1',
        employeeId: 'employee-other',
        orgUnitId: 'org-other',
        orgUnitAncestorIds: [],
      }),
    ).toBe(false);
  });

  it('allows HR to access authorized factories only', () => {
    const principal: AuthPrincipal = {
      id: 'user-hr',
      tenantId: 'tenant-1',
      employeeId: null,
      roles: ['HR_ADMIN'],
      dataScopes: [
        {
          type: 'FACTORY',
          factoryId: 'factory-1',
        },
      ],
    };

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
      }),
    ).toBe(true);

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-1',
        factoryId: 'factory-2',
      }),
    ).toBe(false);
  });

  it('prevents tenant admins from crossing tenant boundaries', () => {
    const principal: AuthPrincipal = {
      id: 'user-admin',
      tenantId: 'tenant-1',
      employeeId: null,
      roles: ['TENANT_ADMIN'],
      dataScopes: [
        {
          type: 'TENANT',
        },
      ],
    };

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-1',
        factoryId: 'factory-1',
      }),
    ).toBe(true);

    expect(
      service.canAccessResource(principal, {
        tenantId: 'tenant-2',
        factoryId: 'factory-1',
      }),
    ).toBe(false);
  });
});
