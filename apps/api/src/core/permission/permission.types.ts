export const roleNames = [
  'TENANT_ADMIN',
  'HR_ADMIN',
  'ORG_MANAGER',
  'EMPLOYEE',
] as const;

export type RoleName = (typeof roleNames)[number];

export const permissionNames = [
  'account:user:view',
  'account:user:manage',
  'permission:role:manage',
  'organization:unit:view',
  'organization:unit:manage',
  'employee:profile:view',
  'employee:profile:edit',
  'shift:rule:view',
  'shift:rule:manage',
  'attendance:group:view',
  'attendance:group:manage',
  'attendance:checkin:create',
  'attendance:record:view',
  'attendance:record:edit',
  'attendance:result:view',
  'attendance:result:recalculate',
  'attendance:report:export',
  'leave:request:create',
  'leave:request:view',
  'leave:request:approve',
  'repair:request:create',
  'repair:request:view',
  'repair:request:approve',
  'audit-log:view',
] as const;

export type PermissionName = (typeof permissionNames)[number];

export type TenantDataScope = {
  type: 'TENANT';
};

export type FactoryDataScope = {
  type: 'FACTORY';
  factoryId: string;
};

export type OrgUnitDataScope = {
  type: 'ORG_UNIT';
  orgUnitId: string;
};

export type EmployeeDataScope = {
  type: 'EMPLOYEE';
  employeeId: string;
};

export type DataScope =
  | TenantDataScope
  | FactoryDataScope
  | OrgUnitDataScope
  | EmployeeDataScope;

export type ResourceAccessTarget = {
  tenantId: string;
  factoryId?: string | null;
  orgUnitId?: string | null;
  orgUnitAncestorIds?: string[];
  employeeId?: string | null;
};
