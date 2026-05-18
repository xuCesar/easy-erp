import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './token.service';
import type { AuthPrincipal } from './auth.types';

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthPrincipal;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    const claims = this.tokenService.verifyAccessToken(token);

    request.user = {
      id: claims.id,
      tenantId: claims.tenantId,
      employeeId: claims.employeeId,
      roles: claims.roles,
      dataScopes: claims.dataScopes,
    };

    return true;
  }

  private extractBearerToken(value: string | string[] | undefined): string {
    const header = Array.isArray(value) ? value[0] : value;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required.');
    }

    return header.slice('Bearer '.length);
  }
}
