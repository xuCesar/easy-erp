import { Injectable, NestMiddleware } from '@nestjs/common';
import { runWithTenantContext } from './tenant-context';

type AuthenticatedRequest = {
  user?: {
    tenantId?: string;
    sub?: string;
    factoryIds?: string[];
  };
};

type NextFunction = () => void;

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: unknown, next: NextFunction): void {
    const { tenantId, sub, factoryIds } = req.user ?? {};

    if (!tenantId || !sub) {
      next();
      return;
    }

    runWithTenantContext(
      {
        tenantId,
        userId: sub,
        factoryIds: factoryIds ?? [],
      },
      next,
    );
  }
}
