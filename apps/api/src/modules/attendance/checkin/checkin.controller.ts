import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../../core/auth';
import { PermissionGuard, RequirePermission } from '../../../core/permission';
import { CheckinService, type CheckinRequest } from './checkin.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('attendance')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('checkin-context')
  @RequirePermission('attendance:checkin:create')
  async getContext(
    @Req() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ): Promise<unknown> {
    return ok(await this.checkinService.getContext(req.user, date ?? today()));
  }

  @Post('checkin')
  @RequirePermission('attendance:checkin:create')
  async checkin(
    @Req() req: AuthenticatedRequest,
    @Body() body: CheckinHttpRequest,
  ): Promise<unknown> {
    assertCheckinBody(body);

    return ok(
      await this.checkinService.checkin(req.user, {
        checkinType: body.checkinType,
        clientEventAt: body.clientEventAt ? new Date(body.clientEventAt) : null,
        idempotencyKey: body.idempotencyKey,
        location: body.location ?? null,
        wifi: body.wifi ?? null,
        deviceId: body.deviceId ?? null,
        photoUrl: body.photoUrl ?? null,
      }),
    );
  }
}

type CheckinHttpRequest = Omit<CheckinRequest, 'clientEventAt'> & {
  clientEventAt?: string | null;
};

function assertCheckinBody(body: CheckinHttpRequest): void {
  if (!body?.checkinType || !body.idempotencyKey) {
    throw new BadRequestException('Invalid check-in request.');
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
