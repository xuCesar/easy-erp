import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { PermissionGuard, RequirePermission } from '../../core/permission';
import type { PublicApprovalStatus } from '../approval-view.types';
import { LeaveService } from './leave.service';
import type { CreateLeaveRequestInput } from './leave.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('leave/requests')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @RequirePermission('leave:request:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('status') status?: PublicApprovalStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(
      await this.leaveService.list(req.user, {
        factoryId,
        orgUnitId: orgUnitId ?? null,
        status,
        page: toOptionalNumber(page),
        pageSize: toOptionalNumber(pageSize),
      }),
    );
  }

  @Post()
  @RequirePermission('leave:request:create')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: LeaveRequestBody,
  ): Promise<unknown> {
    const employeeId = requireEmployeeId(req.user);
    assertCreateBody(body);

    return ok(
      await this.leaveService.create({
        tenantId: req.user.tenantId,
        factoryId: body.factoryId,
        employeeId,
        leaveType: body.leaveType,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        durationHours: body.durationHours,
        reason: body.reason,
        attachments: body.attachments ?? [],
      }),
    );
  }

  @Post(':id/approve')
  @RequirePermission('leave:request:approve')
  async approve(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return ok(await this.leaveService.approve(req.user, id));
  }

  @Post(':id/reject')
  @RequirePermission('leave:request:approve')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { rejectReason?: string },
  ): Promise<unknown> {
    if (!body.rejectReason) {
      throw new BadRequestException('rejectReason is required.');
    }

    return ok(await this.leaveService.reject(req.user, id, body.rejectReason));
  }
}

type LeaveRequestBody = Omit<
  CreateLeaveRequestInput,
  'tenantId' | 'employeeId' | 'startAt' | 'endAt'
> & {
  startAt: string;
  endAt: string;
};

function requireEmployeeId(principal: AuthPrincipal): string {
  if (!principal.employeeId) {
    throw new ForbiddenException('Current account is not linked to employee.');
  }

  return principal.employeeId;
}

function assertCreateBody(body: LeaveRequestBody): void {
  if (!body?.factoryId || !body.leaveType || !body.startAt || !body.endAt) {
    throw new BadRequestException('Invalid leave request.');
  }
}

function toOptionalNumber(value: string | undefined): number | undefined {
  return value ? Number(value) : undefined;
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
