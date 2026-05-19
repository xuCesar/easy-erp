import { SetMetadata } from '@nestjs/common';
import { permissionMetadataKey } from './permission.constants';
import type { PermissionName } from './permission.types';

export function RequirePermission(permission: PermissionName): MethodDecorator & ClassDecorator {
  return SetMetadata(permissionMetadataKey, permission);
}
