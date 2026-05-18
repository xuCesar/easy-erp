import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { permissionMetadataKey } from './permission.constants';
import { PermissionService } from './permission.service';
import type { AuthPrincipal } from '../auth/auth.types';
import type { PermissionName } from './permission.types';

type AuthenticatedRequest = {
  user?: AuthPrincipal;
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<PermissionName>(
      permissionMetadataKey,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (
      requiredPermission &&
      !this.permissionService.hasPermission(request.user, requiredPermission)
    ) {
      throw new ForbiddenException('Permission denied.');
    }

    return true;
  }
}
