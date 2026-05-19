import {
  BadRequestException,
  Body,
  Controller,
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
import { ReportService } from './report.service';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

@Controller('reports')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('monthly')
  @RequirePermission('attendance:result:view')
  async getMonthlyReport(
    @Req() req: AuthenticatedRequest,
    @Query('factoryId') factoryId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('month') month?: string,
  ): Promise<unknown> {
    if (!factoryId || !month) {
      throw new BadRequestException('factoryId and month are required.');
    }

    return ok(
      await this.reportService.getMonthlyReport({
        tenantId: req.user.tenantId,
        factoryId,
        orgUnitId: orgUnitId ?? null,
        month,
      }),
    );
  }

  @Post('monthly/export')
  @RequirePermission('attendance:report:export')
  async createMonthlyExport(
    @Req() req: AuthenticatedRequest,
    @Body() body: { factoryId?: string; orgUnitId?: string | null; month?: string },
  ): Promise<unknown> {
    if (!body.factoryId || !body.month) {
      throw new BadRequestException('factoryId and month are required.');
    }

    return ok(
      await this.reportService.createMonthlyExportTask({
        tenantId: req.user.tenantId,
        factoryId: body.factoryId,
        orgUnitId: body.orgUnitId ?? null,
        month: body.month,
        requestedBy: req.user.id,
      }),
    );
  }

  @Post('monthly/lock')
  @RequirePermission('attendance:report:export')
  async lockMonthlyReport(
    @Req() req: AuthenticatedRequest,
    @Body() body: { factoryId?: string; orgUnitId?: string | null; month?: string },
  ): Promise<unknown> {
    if (!body.factoryId || !body.month) {
      throw new BadRequestException('factoryId and month are required.');
    }

    return ok(
      await this.reportService.confirmMonthlyExportAndLock({
        tenantId: req.user.tenantId,
        factoryId: body.factoryId,
        orgUnitId: body.orgUnitId ?? null,
        month: body.month,
        confirmedBy: req.user.id,
      }),
    );
  }

  @Get('tasks/:taskId')
  @RequirePermission('attendance:report:export')
  async getTask(
    @Req() req: AuthenticatedRequest,
    @Param('taskId') taskId: string,
  ): Promise<unknown> {
    return ok(await this.reportService.getExportTask(req.user.tenantId, taskId));
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
