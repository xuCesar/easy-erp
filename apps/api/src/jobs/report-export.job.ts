import { Injectable } from '@nestjs/common';
import type { ReportRepository } from '../modules/report';

@Injectable()
export class ReportExportJob {
  constructor(private readonly repository: ReportRepository) {}

  async completeTask(
    tenantId: string,
    taskId: string,
    downloadUrl: string,
  ): Promise<void> {
    await this.repository.updateExportTask(tenantId, taskId, {
      status: 'COMPLETED',
      downloadUrl,
    });
  }

  async failTask(tenantId: string, taskId: string): Promise<void> {
    await this.repository.updateExportTask(tenantId, taskId, {
      status: 'FAILED',
    });
  }
}
