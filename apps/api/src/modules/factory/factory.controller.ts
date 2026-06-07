import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { FactoryService } from './factory.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('factories')
@UseGuards(AccessTokenGuard)
export class FactoryController {
  constructor(private readonly factoryService: FactoryService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<unknown> {
    return ok(await this.factoryService.listAccessible(req.user));
  }
}

function ok<T>(
  data: T,
): { code: 0; message: 'success'; data: T; requestId: string } {
  return {
    code: 0,
    message: 'success',
    data,
    requestId: randomUUID(),
  };
}
