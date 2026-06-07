import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AttendancePrimaryStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard } from '../../../core/auth/access-token.guard';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import {
  PermissionGuard,
  PermissionService,
  RequirePermission,
} from '../../../core/permission';
import { attendanceResultRepositoryToken } from '../attendance.tokens';
import type {
  AttendanceResultListItem,
  AttendanceResultRepository,
} from './attendance-result.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('attendance/results')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AttendanceResultController {
  constructor(
    @Inject(attendanceResultRepositoryToken)
    private readonly repository: AttendanceResultRepository,
    private readonly permissionService: PermissionService,
  ) {}

  @Get()
  @RequirePermission('attendance:result:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('primaryStatus') primaryStatus?: AttendancePrimaryStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    if (!factoryId || !startDate || !endDate) {
      throw new BadRequestException('factoryId, startDate and endDate are required.');
    }

    const query = {
      factoryId,
      employeeId: employeeId ?? null,
      orgUnitId: orgUnitId ?? null,
      startDate,
      endDate,
      primaryStatus,
      page: parsePositiveInt(page, 1),
      pageSize: Math.min(parsePositiveInt(pageSize, 20), 100),
    };
    const result = await this.repository.list(req.user.tenantId, query);
    const items = result.items.filter((item) => this.canAccess(req.user, item));

    return ok({
      items: items.map(toRow),
      total: items.length,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(items.length / query.pageSize),
    });
  }

  private canAccess(
    principal: AuthPrincipal,
    item: AttendanceResultListItem,
  ): boolean {
    return this.permissionService.canAccessResource(principal, {
      tenantId: item.tenantId,
      factoryId: item.factoryId,
      employeeId: item.employeeId,
      orgUnitId: item.orgUnitId,
    });
  }
}

function toRow(item: AttendanceResultListItem): {
  id: string;
  employeeId: string;
  employeeName: string;
  empNo: string;
  date: string;
  primaryStatus: AttendancePrimaryStatus;
  clockInAt: string | null;
  clockOutAt: string | null;
  workMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isFinalized: boolean;
} {
  return {
    id: item.id,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    empNo: item.empNo,
    date: item.date,
    primaryStatus: item.primaryStatus as AttendancePrimaryStatus,
    clockInAt: item.clockInAt?.toISOString() ?? null,
    clockOutAt: item.clockOutAt?.toISOString() ?? null,
    workMinutes: item.workMinutes,
    lateMinutes: item.lateMinutes,
    earlyLeaveMinutes: item.earlyLeaveMinutes,
    isFinalized: item.isFinalized,
  };
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
