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
import { EmployeeService } from './employee.service';
import type { CreateEmployeeInput, UpdateEmployeeInput } from './employee.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('employees')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @RequirePermission('employee:profile:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('status') status?: CreateEmployeeInput['status'],
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(
      await this.employeeService.list(req.user.tenantId, {
        factoryId,
        orgUnitId: orgUnitId ?? null,
        status,
        keyword: keyword ?? null,
        page: parsePositiveInt(page, 1),
        pageSize: Math.min(parsePositiveInt(pageSize, 20), 100),
      }),
    );
  }

  @Post()
  @RequirePermission('employee:profile:edit')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: Omit<CreateEmployeeInput, 'tenantId'>,
  ): Promise<unknown> {
    assertCreateEmployeeBody(body);

    return ok(
      await this.employeeService.create({
        ...body,
        tenantId: req.user.tenantId,
        entryDate: new Date(body.entryDate),
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('employee:profile:edit')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateEmployeeInput,
  ): Promise<unknown> {
    return ok(
      await this.employeeService.update(req.user.tenantId, id, {
        ...body,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      }),
    );
  }

  @Delete(':id')
  @RequirePermission('employee:profile:edit')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    await this.employeeService.remove(req.user.tenantId, id);

    return ok(null);
  }
}

function assertCreateEmployeeBody(
  body: Omit<CreateEmployeeInput, 'tenantId'>,
): void {
  if (
    !body?.factoryId ||
    !body.empNo ||
    !body.name ||
    !body.entryDate ||
    !body.status
  ) {
    throw new BadRequestException('Invalid employee request.');
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
