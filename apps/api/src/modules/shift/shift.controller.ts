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
import { ShiftService } from './shift.service';
import type { CreateShiftInput, UpdateShiftInput } from './shift.repository';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('shifts')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @RequirePermission('shift:rule:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
  ): Promise<unknown> {
    if (!factoryId) {
      throw new BadRequestException('factoryId is required.');
    }

    return ok(await this.shiftService.listByFactory(req.user.tenantId, factoryId));
  }

  @Post()
  @RequirePermission('shift:rule:manage')
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: Omit<CreateShiftInput, 'tenantId'>,
  ): Promise<unknown> {
    return ok(
      await this.shiftService.create({
        ...body,
        tenantId: req.user.tenantId,
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('shift:rule:manage')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateShiftInput,
  ): Promise<unknown> {
    return ok(await this.shiftService.update(req.user.tenantId, id, body));
  }

  @Delete(':id')
  @RequirePermission('shift:rule:manage')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    await this.shiftService.remove(req.user.tenantId, id);
    return ok(null);
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
