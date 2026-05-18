import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard, type AuthPrincipal } from '../../core/auth';
import { PermissionGuard, RequirePermission } from '../../core/permission';
import { AttendanceGroupService } from './attendance-group.service';
import type {
  CreateAttendanceGroupInput,
  UpdateAttendanceGroupInput,
} from './attendance-group.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('attendance-groups')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AttendanceGroupController {
  constructor(private readonly attendanceGroupService: AttendanceGroupService) {}

  @Get()
  @RequirePermission('attendance:group:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(
      await this.attendanceGroupService.listByFactory(req.user.tenantId, factoryId),
    );
  }

  @Post()
  @RequirePermission('attendance:group:manage')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: Omit<CreateAttendanceGroupInput, 'tenantId'>,
  ): Promise<unknown> {
    return ok(
      await this.attendanceGroupService.create({
        ...body,
        tenantId: req.user.tenantId,
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('attendance:group:manage')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAttendanceGroupInput,
  ): Promise<unknown> {
    return ok(await this.attendanceGroupService.update(req.user.tenantId, id, body));
  }

  @Delete(':id')
  @RequirePermission('attendance:group:manage')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    await this.attendanceGroupService.remove(req.user.tenantId, id);
    return ok(null);
  }

  @Post(':id/members')
  @RequirePermission('attendance:group:manage')
  async addMembers(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { employeeIds: string[]; effectiveFrom: string },
  ): Promise<unknown> {
    if (!Array.isArray(body.employeeIds) || body.employeeIds.length === 0) {
      throw new BadRequestException('employeeIds is required.');
    }

    return ok(
      await this.attendanceGroupService.addMembers({
        tenantId: req.user.tenantId,
        attendanceGroupId: id,
        employeeIds: body.employeeIds,
        effectiveFrom: new Date(`${body.effectiveFrom}T00:00:00.000Z`),
        createdBy: req.user.id,
      }),
    );
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
