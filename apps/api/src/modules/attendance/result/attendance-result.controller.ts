import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard } from '../../../core/auth/access-token.guard';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import { PermissionGuard, RequirePermission } from '../../../core/permission';
import {
  AttendanceResultService,
  type AttendanceResultQuery,
} from './attendance-result.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('attendance/results')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AttendanceResultController {
  constructor(private readonly attendanceResultService: AttendanceResultService) {}

  @Get()
  @RequirePermission('attendance:result:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('primaryStatus') primaryStatus?: AttendanceResultQuery['primaryStatus'],
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return ok(
      await this.attendanceResultService.list(req.user, {
        factoryId,
        employeeId,
        orgUnitId: orgUnitId ?? null,
        startDate,
        endDate,
        primaryStatus,
        page: parsePositiveInt(page, 1),
        pageSize: Math.min(parsePositiveInt(pageSize, 20), 100),
      }),
    );
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
