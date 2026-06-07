import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AuthPrincipal } from '../auth/auth.types';
import { PermissionGuard, RequirePermission } from '../permission';
import { AccountService, type CreateAccountRequest, type UpdateAccountRequest } from './account.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('accounts')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @RequirePermission('account:user:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('keyword') keyword?: string,
    @Query('status') status?: 'ACTIVE' | 'DISABLED',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return ok(
      await this.accountService.list(req.user.tenantId, {
        keyword: keyword ?? null,
        status,
        page: parsePositiveInt(page, 1),
        pageSize: Math.min(parsePositiveInt(pageSize, 20), 100),
      }),
    );
  }

  @Post()
  @RequirePermission('account:user:manage')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateAccountRequest,
  ): Promise<unknown> {
    assertCreateBody(body);

    return ok(await this.accountService.create(req.user.tenantId, body));
  }

  @Patch(':id')
  @RequirePermission('account:user:manage')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAccountRequest,
  ): Promise<unknown> {
    return ok(await this.accountService.update(req.user.tenantId, id, body));
  }
}

function assertCreateBody(body: CreateAccountRequest): void {
  if (!body?.phone || !body.password || !body.roles?.length || !body.status) {
    throw new BadRequestException('Invalid account request.');
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
