import { Injectable } from '@nestjs/common';
import { rolePermissions } from './permission.constants';
import type { AuthPrincipal } from '../auth/auth.types';
import type { PermissionName, ResourceAccessTarget } from './permission.types';

@Injectable()
export class PermissionService {
  hasPermission(principal: AuthPrincipal, permission: PermissionName): boolean {
    return principal.roles.some((role) => rolePermissions[role].includes(permission));
  }

  canAccessResource(
    principal: AuthPrincipal,
    target: ResourceAccessTarget,
  ): boolean {
    if (principal.tenantId !== target.tenantId) {
      return false;
    }

    if (principal.roles.includes('TENANT_ADMIN')) {
      return true;
    }

    return principal.dataScopes.some((scope) => {
      switch (scope.type) {
        case 'TENANT':
          return true;
        case 'FACTORY':
          return target.factoryId === scope.factoryId;
        case 'ORG_UNIT':
          return this.isInOrgScope(scope.orgUnitId, target);
        case 'EMPLOYEE':
          return target.employeeId === scope.employeeId;
      }
    });
  }

  private isInOrgScope(
    scopedOrgUnitId: string,
    target: ResourceAccessTarget,
  ): boolean {
    if (target.orgUnitId === scopedOrgUnitId) {
      return true;
    }

    return target.orgUnitAncestorIds?.includes(scopedOrgUnitId) ?? false;
  }
}
